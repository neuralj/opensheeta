import { execSync } from 'child_process';
import { findRepoRoot } from './repo.js';
import { analyzeArchitecture } from './architecture.js';
import { getCIStatus } from './ci.js';

// Cache for repo state
let stateCache: { result: RepoState; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

export interface RepoState {
	repo: {
		name: string;
		branch: string;
		totalCommits: number;
		lastCommit: { hash: string; message: string; date: string; author: string };
	};
	architecture: {
		totalFiles: number;
		totalImports: number;
		layerCounts: Record<string, number>;
		hotModules: { path: string; changes: number }[];
	};
	ci: {
		latestStatus: 'passing' | 'failing' | 'pending' | 'unknown';
		totalRuns: number;
	};
}

function getGitInfo(root: string) {
	try {
		const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: root, encoding: 'utf-8' }).trim();
		const totalCommits = parseInt(execSync('git rev-list --count HEAD', { cwd: root, encoding: 'utf-8' }).trim());
		const lastCommitLine = execSync('git log -1 --format="%H|%s|%ai|%an"', { cwd: root, encoding: 'utf-8' }).trim();
		const [hash, message, date, author] = lastCommitLine.split('|');
		return { branch, totalCommits, lastCommit: { hash, message, date, author } };
	} catch {
		return { branch: 'unknown', totalCommits: 0, lastCommit: { hash: '', message: '', date: '', author: '' } };
	}
}

export async function getRepoState(): Promise<RepoState> {
	// Check cache first
	if (stateCache && Date.now() - stateCache.timestamp < CACHE_TTL) {
		return stateCache.result;
	}

	const root = findRepoRoot();
	const gitInfo = getGitInfo(root);
	const arch = analyzeArchitecture();
	const ci = await getCIStatus();

	const layerCounts: Record<string, number> = {};
	for (const layer of arch.layers) {
		layerCounts[layer.name] = layer.files.length;
	}

	const result = {
		repo: {
			name: 'opensheeta',
			branch: gitInfo.branch,
			totalCommits: gitInfo.totalCommits,
			lastCommit: gitInfo.lastCommit,
		},
		architecture: {
			totalFiles: arch.stats.totalFiles,
			totalImports: arch.stats.totalImports,
			layerCounts,
			hotModules: arch.hotModules.slice(0, 5).map((m) => ({ path: m.path, changes: m.changes })),
		},
		ci: {
			latestStatus: ci.latestStatus,
			totalRuns: ci.runs.length,
		},
	};

	// Update cache
	stateCache = { result, timestamp: Date.now() };

	return result;
}

export async function getContextSnapshot() {
	const state = await getRepoState();
	return {
		repo: state.repo,
		architecture: {
			layers: state.architecture.layerCounts,
			entry_point: 'src/daemon.ts',
			total_files: state.architecture.totalFiles,
			hot_modules: state.architecture.hotModules.map((m) => m.path),
		},
		ci: state.ci,
	};
}
