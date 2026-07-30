import { f as findRepoRoot } from './repo.js-CKpiBgM0.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

//#region src/lib/server/architecture.ts
var architectureCache = null;
var CACHE_TTL = 60 * 1e3;
var LAYER_MAP = {
	"scheduler/": "scheduler",
	"endpoints/": "endpoint",
	"handlers/": "handler",
	"adapters/": "adapter",
	"config/": "config",
	"types/": "types",
	"shared/": "shared"
};
function detectLayer(relativePath) {
	for (const [prefix, layer] of Object.entries(LAYER_MAP)) if (relativePath.startsWith("src/" + prefix)) return layer;
	return "other";
}
function parseImports(content) {
	const imports = [];
	const importRegex = /import\s+.*?\s+from\s+["'](@\/[^"']+)["']/g;
	let match;
	while ((match = importRegex.exec(content)) !== null) imports.push(match[1]);
	return imports;
}
function resolveImport(importPath, root) {
	if (!importPath.startsWith("@/")) return null;
	const relative = importPath.slice(2);
	const candidates = [`src/${relative}.ts`, `src/${relative}/index.ts`];
	for (const c of candidates) {
		const full = join(root, c);
		try {
			statSync(full);
			return c;
		} catch {}
	}
	return `src/${relative}.ts`;
}
function getAllTsFiles(dir, root) {
	const files = [];
	try {
		const entries = readdirSync(dir);
		for (const entry of entries) {
			const full = join(dir, entry);
			try {
				const stat = statSync(full);
				if (stat.isDirectory() && entry !== "node_modules" && entry !== ".svelte-kit") files.push(...getAllTsFiles(full, root));
				else if (stat.isFile() && extname(entry) === ".ts") files.push(full);
			} catch {}
		}
	} catch {}
	return files;
}
function getGitChangeStats(root) {
	const stats = /* @__PURE__ */ new Map();
	try {
		const lines = execSync("git log --name-only --format=\"%H %ai\" -100", {
			cwd: root,
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024
		}).split("\n");
		let currentDate = "";
		for (const line of lines) if (line.match(/^[0-9a-f]{40}/)) {
			const parts = line.split(" ");
			parts[0];
			currentDate = parts.slice(1).join(" ");
		} else if (line.trim() && line.startsWith("src/")) {
			const existing = stats.get(line);
			if (existing) {
				existing.changes++;
				if (new Date(currentDate) > new Date(existing.lastChanged)) existing.lastChanged = currentDate;
			} else stats.set(line, {
				changes: 1,
				lastChanged: currentDate
			});
		}
	} catch {}
	return stats;
}
function detectCircularDeps(files) {
	const graph = /* @__PURE__ */ new Map();
	for (const f of files) graph.set(f.relativePath, f.imports);
	const cycles = [];
	const visited = /* @__PURE__ */ new Set();
	const inStack = /* @__PURE__ */ new Set();
	function dfs(node, path) {
		if (inStack.has(node)) {
			const cycleStart = path.indexOf(node);
			if (cycleStart >= 0) cycles.push(path.slice(cycleStart));
			return;
		}
		if (visited.has(node)) return;
		visited.add(node);
		inStack.add(node);
		path.push(node);
		const deps = graph.get(node) || [];
		for (const dep of deps) dfs(dep, [...path]);
		inStack.delete(node);
	}
	for (const file of files) dfs(file.relativePath, []);
	return cycles;
}
function computeLayerDeps(files) {
	const deps = /* @__PURE__ */ new Map();
	const fileMap = /* @__PURE__ */ new Map();
	for (const f of files) {
		const key = f.relativePath.replace("src/", "").replace(".ts", "");
		fileMap.set(key, f);
	}
	for (const f of files) {
		if (!deps.has(f.layer)) deps.set(f.layer, /* @__PURE__ */ new Set());
		for (const imp of f.imports) {
			const key = imp.replace("src/", "").replace(".ts", "");
			const impFile = fileMap.get(key);
			if (impFile && impFile.layer !== f.layer) deps.get(f.layer).add(impFile.layer);
		}
	}
	return deps;
}
function generateMermaidGraph(files, layerDeps) {
	const lines = ["graph TD"];
	const layerColors = {
		scheduler: "#89b4fa",
		endpoint: "#a6e3a1",
		handler: "#f9e2af",
		adapter: "#cba6f7",
		config: "#94e2d5",
		types: "#f38ba8",
		shared: "#f5c2e7",
		other: "#6c7086"
	};
	const fileMap = /* @__PURE__ */ new Map();
	for (const f of files) {
		const key = f.relativePath.replace("src/", "").replace(".ts", "");
		fileMap.set(key, f);
	}
	for (const f of files) {
		if (f.relativePath === "src/daemon.ts") continue;
		const label = f.relativePath.replace("src/", "").replace(".ts", "");
		lines.push(`    ${f.relativePath.replace(/[^a-zA-Z0-9]/g, "_")}["${label}"]:::layer_${f.layer}`);
	}
	for (const f of files) for (const imp of f.imports) {
		const key = imp.replace("src/", "").replace(".ts", "");
		const targetFile = fileMap.get(key);
		if (targetFile) {
			const from = f.relativePath.replace(/[^a-zA-Z0-9]/g, "_");
			const to = targetFile.relativePath.replace(/[^a-zA-Z0-9]/g, "_");
			lines.push(`    ${from} --> ${to}`);
		}
	}
	for (const [layer, color] of Object.entries(layerColors)) lines.push(`    classDef layer_${layer} fill:${color}22,stroke:${color},color:${color}`);
	return lines.join("\n");
}
function analyzeArchitecture() {
	if (architectureCache && Date.now() - architectureCache.timestamp < CACHE_TTL) return architectureCache.result;
	const root = findRepoRoot();
	const allFiles = getAllTsFiles(join(root, "src"), root);
	const gitStats = getGitChangeStats(root);
	const fileNodes = [];
	let totalImports = 0;
	for (const fullPath of allFiles) {
		const relPath = relative(root, fullPath);
		const content = readFileSync(fullPath, "utf-8");
		const resolvedImports = parseImports(content).map((imp) => resolveImport(imp, root)).filter((r) => r !== null);
		totalImports += resolvedImports.length;
		fileNodes.push({
			path: fullPath,
			relativePath: relPath,
			layer: detectLayer(relPath),
			imports: resolvedImports,
			lineCount: content.split("\n").length
		});
	}
	const layerDeps = computeLayerDeps(fileNodes);
	const layers = [];
	for (const [layer, deps] of layerDeps) layers.push({
		name: layer,
		files: fileNodes.filter((f) => f.layer === layer).map((f) => f.relativePath),
		dependsOn: [...deps]
	});
	const hotModules = [];
	for (const [path, stats] of gitStats) if (path.startsWith("src/")) hotModules.push({
		path,
		changes: stats.changes,
		lastChanged: stats.lastChanged
	});
	hotModules.sort((a, b) => b.changes - a.changes);
	const circularDeps = detectCircularDeps(fileNodes);
	const layerViolations = (() => {
		let count = 0;
		const fileMap = /* @__PURE__ */ new Map();
		for (const f of fileNodes) {
			const key = f.relativePath.replace("src/", "").replace(".ts", "");
			fileMap.set(key, f);
		}
		const layerOrder = [
			"types",
			"shared",
			"config",
			"adapter",
			"handler",
			"endpoint",
			"scheduler"
		];
		for (const f of fileNodes) for (const imp of f.imports) {
			const key = imp.replace("src/", "").replace(".ts", "");
			const impFile = fileMap.get(key);
			if (impFile) {
				const fromIdx = layerOrder.indexOf(f.layer);
				const toIdx = layerOrder.indexOf(impFile.layer);
				if (fromIdx >= 0 && toIdx >= 0 && toIdx > fromIdx + 1) count++;
			}
		}
		return count;
	})();
	const couplingScore = totalImports / Math.max(fileNodes.length, 1) / 10;
	const result = {
		files: fileNodes,
		layers,
		hotModules: hotModules.slice(0, 10),
		circularDeps,
		stats: {
			totalFiles: fileNodes.length,
			totalImports,
			couplingScore: Math.min(couplingScore, 1),
			layerViolations
		},
		mermaidGraph: generateMermaidGraph(fileNodes)
	};
	architectureCache = {
		result,
		timestamp: Date.now()
	};
	return result;
}

export { analyzeArchitecture as a };
//# sourceMappingURL=architecture.js-CsbP7I0I.js.map
