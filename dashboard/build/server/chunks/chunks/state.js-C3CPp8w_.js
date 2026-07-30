import { f as findRepoRoot } from './repo.js-CKpiBgM0.js';
import { a as analyzeArchitecture } from './architecture.js-CsbP7I0I.js';
import { a as analyzeHealth } from './health.js-Dl6V4OGP.js';
import { l as listMemory } from './memory.js-Bo9rRBoq.js';
import { g as getTimeline } from './timeline.js-bDiasbG6.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import initSqlJs from 'sql.js';

//#region src/lib/server/state.ts
var stateCache = null;
var CACHE_TTL = 60 * 1e3;
function getGitInfo(root) {
	try {
		const branch = execSync("git rev-parse --abbrev-ref HEAD", {
			cwd: root,
			encoding: "utf-8"
		}).trim();
		const totalCommits = parseInt(execSync("git rev-list --count HEAD", {
			cwd: root,
			encoding: "utf-8"
		}).trim());
		const [hash, message, date, author] = execSync("git log -1 --format=\"%H|%s|%ai|%an\"", {
			cwd: root,
			encoding: "utf-8"
		}).trim().split("|");
		return {
			branch,
			totalCommits,
			lastCommit: {
				hash,
				message,
				date,
				author
			}
		};
	} catch {
		return {
			branch: "unknown",
			totalCommits: 0,
			lastCommit: {
				hash: "",
				message: "",
				date: "",
				author: ""
			}
		};
	}
}
async function getTaskCounts(root) {
	const dbPath = join(root, "tasks.db");
	if (!existsSync(dbPath)) return {
		pending: 0,
		running: 0,
		completed: 0,
		failed: 0
	};
	const SQL = await initSqlJs();
	const buffer = readFileSync(dbPath);
	const db = new SQL.Database(buffer);
	const counts = {
		pending: 0,
		running: 0,
		completed: 0,
		failed: 0
	};
	try {
		for (const status of [
			"pending",
			"running",
			"completed",
			"failed"
		]) {
			const stmt = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status = ?");
			stmt.bind([status]);
			if (stmt.step()) counts[status] = stmt.getAsObject().cnt;
			stmt.free();
		}
	} catch {}
	return counts;
}
async function getRepoState() {
	if (stateCache && Date.now() - stateCache.timestamp < CACHE_TTL) return stateCache.result;
	const root = findRepoRoot();
	const gitInfo = getGitInfo(root);
	const arch = analyzeArchitecture();
	const health = analyzeHealth();
	const memories = await listMemory();
	const timeline = await getTimeline(10);
	const taskCounts = await getTaskCounts(root);
	const layerCounts = {};
	for (const layer of arch.layers) layerCounts[layer.name] = layer.files.length;
	const result = {
		repo: {
			name: "opensheeta",
			branch: gitInfo.branch,
			totalCommits: gitInfo.totalCommits,
			lastCommit: gitInfo.lastCommit
		},
		architecture: {
			totalFiles: arch.stats.totalFiles,
			totalImports: arch.stats.totalImports,
			layerCounts,
			hotModules: arch.hotModules.slice(0, 5).map((m) => ({
				path: m.path,
				changes: m.changes
			}))
		},
		tasks: taskCounts,
		health: {
			score: health.score,
			typecheck: health.details.typecheck.pass ? "pass" : `${health.details.typecheck.errors} errors`,
			tests: `${health.details.tests.passed}/${health.details.tests.total} passed`,
			build: health.details.build.pass ? "pass" : "fail"
		},
		recentDecisions: memories.slice(0, 5).map((m) => ({
			id: m.id,
			title: m.title,
			category: m.category,
			created_at: m.created_at
		})),
		timeline: timeline.entries.slice(0, 5).map((e) => ({
			id: e.id,
			title: e.title,
			type: e.type,
			status: e.status,
			startedAt: e.startedAt
		})),
		conventions: {
			module_system: "ESM (\"type\": \"module\")",
			target: "Node 22",
			framework: "Hono (REST) + ws (WebSocket)",
			storage: "SQLite via sql.js (WASM)",
			pattern: "Factory functions (not classes)",
			path_alias: "@/* → ./src/*",
			architecture: "Scheduler + Endpoint → Handler → Adapter"
		}
	};
	stateCache = {
		result,
		timestamp: Date.now()
	};
	return result;
}
async function getContextSnapshot() {
	const state = await getRepoState();
	return {
		repo: state.repo,
		architecture: {
			layers: state.architecture.layerCounts,
			entry_point: "src/daemon.ts",
			total_files: state.architecture.totalFiles,
			hot_modules: state.architecture.hotModules.map((m) => m.path)
		},
		current_state: {
			open_tasks: state.tasks.pending,
			running_tasks: state.tasks.running,
			failed_tasks: state.tasks.failed
		},
		health: {
			typecheck: state.health.typecheck,
			tests: state.health.tests,
			build: state.health.build,
			score: state.health.score
		},
		recent_decisions: state.recentDecisions,
		conventions: state.conventions
	};
}

export { getRepoState as a, getContextSnapshot as g };
//# sourceMappingURL=state.js-C3CPp8w_.js.map
