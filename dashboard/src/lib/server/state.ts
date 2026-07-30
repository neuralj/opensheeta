import { execSync } from 'child_process';
import { findRepoRoot } from './repo.js';
import { analyzeArchitecture } from './architecture.js';
import { analyzeHealth } from './health.js';
import { listMemory } from './memory.js';
import { getTimeline } from './timeline.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import initSqlJs from 'sql.js';

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
	tasks: {
		pending: number;
		running: number;
		completed: number;
		failed: number;
	};
	health: {
		score: number;
		typecheck: string;
		tests: string;
		build: string;
	};
	recentDecisions: { id: string; title: string; category: string; created_at: number }[];
	timeline: { id: string; title: string; type: string; status: string; startedAt: number }[];
	conventions: Record<string, string>;
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

async function getTaskCounts(root: string): Promise<{ pending: number; running: number; completed: number; failed: number }> {
	const dbPath = join(root, 'tasks.db');
	if (!existsSync(dbPath)) return { pending: 0, running: 0, completed: 0, failed: 0 };

	const SQL = await initSqlJs();
	const buffer = readFileSync(dbPath);
	const db = new SQL.Database(buffer);

	const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
	try {
		for (const status of ['pending', 'running', 'completed', 'failed'] as const) {
			const stmt = db.prepare('SELECT COUNT(*) as cnt FROM tasks WHERE status = ?');
			stmt.bind([status]);
			if (stmt.step()) {
				counts[status] = (stmt.getAsObject() as Record<string, unknown>).cnt as number;
			}
			stmt.free();
		}
	} catch {
		// table might not exist
	}
	return counts;
}

export async function getRepoState(): Promise<RepoState> {
	// Check cache first
	if (stateCache && Date.now() - stateCache.timestamp < CACHE_TTL) {
		return stateCache.result;
	}

	const root = findRepoRoot();
	const gitInfo = getGitInfo(root);
	const arch = analyzeArchitecture();
	const health = analyzeHealth();
	const memories = await listMemory();
	const timeline = await getTimeline(10);
	const taskCounts = await getTaskCounts(root);

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
		tasks: taskCounts,
		health: {
			score: health.score,
			typecheck: health.details.typecheck.pass ? 'pass' : `${health.details.typecheck.errors} errors`,
			tests: `${health.details.tests.passed}/${health.details.tests.total} passed`,
			build: health.details.build.pass ? 'pass' : 'fail',
		},
		recentDecisions: memories.slice(0, 5).map((m) => ({
			id: m.id,
			title: m.title,
			category: m.category,
			created_at: m.created_at,
		})),
		timeline: timeline.entries.slice(0, 5).map((e) => ({
			id: e.id,
			title: e.title,
			type: e.type,
			status: e.status,
			startedAt: e.startedAt,
		})),
		conventions: {
			module_system: 'ESM ("type": "module")',
			target: 'Node 22',
			framework: 'Hono (REST) + ws (WebSocket)',
			storage: 'SQLite via sql.js (WASM)',
			pattern: 'Factory functions (not classes)',
			path_alias: '@/* → ./src/*',
			architecture: 'Scheduler + Endpoint → Handler → Adapter',
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
		current_state: {
			open_tasks: state.tasks.pending,
			running_tasks: state.tasks.running,
			failed_tasks: state.tasks.failed,
		},
		health: {
			typecheck: state.health.typecheck,
			tests: state.health.tests,
			build: state.health.build,
			score: state.health.score,
		},
		recent_decisions: state.recentDecisions,
		conventions: state.conventions,
	};
}
