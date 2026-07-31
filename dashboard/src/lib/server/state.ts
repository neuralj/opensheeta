import { execSync } from 'child_process';
import { findRepoRoot } from './repo.js';
import { analyzeArchitecture } from './architecture.js';
import { getCIStatus } from './ci.js';
import type { RepoState } from '$lib/types.js';

// Cache for repo state
let stateCache: { result: RepoState; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

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

export async function getRepoState(options?: { force?: boolean }): Promise<RepoState> {
	// Check cache first
	if (!options?.force && stateCache && Date.now() - stateCache.timestamp < CACHE_TTL) {
		return stateCache.result;
	}

	const root = findRepoRoot();
	const gitInfo = getGitInfo(root);
	const arch = analyzeArchitecture();
	const ci = await getCIStatus(options);

	const layerCounts: Record<string, number> = {};
	for (const layer of arch.layers) {
		layerCounts[layer.name] = layer.files.length;
	}

	const result: RepoState = {
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
