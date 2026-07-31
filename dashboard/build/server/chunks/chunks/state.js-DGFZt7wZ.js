import { f as findRepoRoot } from './repo.js-CKpiBgM0.js';
import { a as analyzeArchitecture } from './architecture.js-CauFPUHb.js';
import { execSync } from 'child_process';

//#region src/lib/server/ci.ts
var ciCache = null;
var CACHE_TTL$1 = 60 * 1e3;
function getGitHubRepoInfo() {
	try {
		const match = execSync("git remote get-url origin", {
			cwd: findRepoRoot(),
			encoding: "utf-8"
		}).trim().match(/github\.com[:/]([^/]+)\/([^/.]+)/);
		if (match) return {
			owner: match[1],
			repo: match[2]
		};
	} catch {}
	return null;
}
async function getCIStatus() {
	if (ciCache && Date.now() - ciCache.timestamp < CACHE_TTL$1) return ciCache.result;
	const repoInfo = getGitHubRepoInfo();
	if (!repoInfo) {
		const result = {
			runs: [],
			latestStatus: "unknown"
		};
		ciCache = {
			result,
			timestamp: Date.now()
		};
		return result;
	}
	try {
		const token = process.env.GITHUB_TOKEN;
		const headers = {
			"Accept": "application/vnd.github.v3+json",
			"User-Agent": "opensheeta-dashboard"
		};
		if (token) headers["Authorization"] = `Bearer ${token}`;
		const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/actions/runs?per_page=10`, { headers });
		if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
		const runs = (await response.json()).workflow_runs.map((run) => ({
			id: run.id,
			name: run.name,
			status: run.status,
			conclusion: run.conclusion,
			created_at: run.created_at,
			updated_at: run.updated_at,
			head_branch: run.head_branch,
			head_sha: run.head_sha,
			html_url: run.html_url,
			run_number: run.run_number,
			event: run.event
		}));
		const completedRuns = runs.filter((r) => r.status === "completed");
		let latestStatus = "unknown";
		if (runs.some((r) => r.status === "in_progress" || r.status === "queued")) latestStatus = "pending";
		else if (completedRuns.length > 0) latestStatus = completedRuns[0].conclusion === "success" ? "passing" : "failing";
		const result = {
			runs,
			latestStatus
		};
		ciCache = {
			result,
			timestamp: Date.now()
		};
		return result;
	} catch (error) {
		console.error("Failed to fetch CI status:", error);
		const result = {
			runs: [],
			latestStatus: "unknown"
		};
		ciCache = {
			result,
			timestamp: Date.now()
		};
		return result;
	}
}
//#endregion
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
async function getRepoState() {
	if (stateCache && Date.now() - stateCache.timestamp < CACHE_TTL) return stateCache.result;
	const gitInfo = getGitInfo(findRepoRoot());
	const arch = analyzeArchitecture();
	const ci = await getCIStatus();
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
		ci: {
			latestStatus: ci.latestStatus,
			totalRuns: ci.runs.length
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
		ci: state.ci
	};
}

export { getRepoState as a, getContextSnapshot as g };
//# sourceMappingURL=state.js-DGFZt7wZ.js.map
