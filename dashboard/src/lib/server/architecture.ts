import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';
import { findRepoRoot } from './repo.js';
import type { ArchitectureResult, FileNode, HotModule, Layer, LayerInfo } from '$lib/types.js';

// Cache for architecture analysis results
let architectureCache: { result: ArchitectureResult; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

const LAYER_MAP: Record<string, Layer> = {
	'scheduler/': 'scheduler',
	'endpoints/': 'endpoint',
	'handlers/': 'handler',
	'adapters/': 'adapter',
	'config/': 'config',
	'types/': 'types',
	'shared/': 'shared',
};

const OVERVIEW_GRAPH = [
	'graph LR',
	'',
	'    Entry["daemon.ts<br/>Entry Point"]',
	'',
	'    subgraph Endpoints["Endpoints · 4 files"]',
	'        REST["REST API"]',
	'        WS["WebSocket"]',
	'        SSE["SSE Events"]',
	'        InboxREST["Inbox REST"]',
	'    end',
	'',
	'    subgraph Handlers["Handlers · 6 files"]',
	'        Session["Session"]',
	'        Approval["Approval"]',
	'        EventBridge["Event Bridge"]',
	'        Persona["Persona"]',
	'        Unattended["Unattended"]',
	'        Automation["Automation"]',
	'    end',
	'',
	'    subgraph Scheduler["Scheduler · 7 files"]',
	'        Queue["Queue Processor"]',
	'        Cooldown["Cooldown Manager"]',
	'        Pipeline["Pipeline Runner"]',
	'        Recurring["Recurring Scheduler"]',
	'        EventBus["Event Bus"]',
	'        HealthProbe["Health Probe"]',
	'    end',
	'',
	'    subgraph Adapters["Adapters · 10 files"]',
	'        OpenCode["OpenCode API"]',
	'        SQLite["SQLite Stores"]',
	'        MCP["MCP Servers"]',
	'        GUI["GUI Broadcast"]',
	'    end',
	'',
	'    Entry --> Endpoints',
	'    Entry --> Handlers',
	'    Entry --> Scheduler',
	'',
	'    Endpoints --> Handlers',
	'    Handlers --> Scheduler',
	'    Handlers --> Adapters',
	'    Scheduler --> Adapters',
	'    Adapters -.->|events| Handlers',
	'',
	'    classDef entry fill:#f38ba8,stroke:#f38ba8,color:#1e1e2e',
	'    classDef endpoint fill:#a6e3a1,stroke:#a6e3a1,color:#1e1e2e',
	'    classDef handler fill:#f9e2af,stroke:#f9e2af,color:#1e1e2e',
	'    classDef scheduler fill:#89b4fa,stroke:#89b4fa,color:#1e1e2e',
	'    classDef adapter fill:#cba6f7,stroke:#cba6f7,color:#1e1e2e',
	'',
	'    class Entry entry',
	'    class REST,WS,SSE,InboxREST endpoint',
	'    class Session,Approval,EventBridge,Persona,Unattended,Automation handler',
	'    class Queue,Cooldown,Pipeline,Recurring,EventBus,HealthProbe scheduler',
	'    class OpenCode,SQLite,MCP,GUI adapter',
].join('\n');

function detectLayer(relativePath: string): Layer {
	for (const [prefix, layer] of Object.entries(LAYER_MAP)) {
		if (relativePath.startsWith('src/' + prefix)) return layer;
	}
	return 'other';
}

function parseImports(content: string): string[] {
	const imports: string[] = [];
	const importRegex = /import\s+.*?\s+from\s+["'](@\/[^"']+)["']/g;
	let match;
	while ((match = importRegex.exec(content)) !== null) {
		imports.push(match[1]);
	}
	return imports;
}

function resolveImport(importPath: string, root: string): string | null {
	if (!importPath.startsWith('@/')) return null;
	const relative = importPath.slice(2);
	const candidates = [`src/${relative}.ts`, `src/${relative}/index.ts`];
	for (const c of candidates) {
		const full = join(root, c);
		try {
			statSync(full);
			return c;
		} catch {
			// try next
		}
	}
	return `src/${relative}.ts`;
}

function getAllTsFiles(dir: string, root: string): string[] {
	const files: string[] = [];
	try {
		const entries = readdirSync(dir);
		for (const entry of entries) {
			const full = join(dir, entry);
			try {
				const stat = statSync(full);
				if (stat.isDirectory() && entry !== 'node_modules' && entry !== '.svelte-kit') {
					files.push(...getAllTsFiles(full, root));
				} else if (stat.isFile() && extname(entry) === '.ts') {
					files.push(full);
				}
			} catch {
				// skip
			}
		}
	} catch {
		// skip
	}
	return files;
}

function getGitChangeStats(root: string): Map<string, { changes: number; lastChanged: string }> {
	const stats = new Map<string, { changes: number; lastChanged: string }>();
	try {
		const output = execSync('git log --name-only --format="%H %ai" -100', {
			cwd: root,
			encoding: 'utf-8',
			maxBuffer: 10 * 1024 * 1024,
		});
		const lines = output.split('\n');
		let currentDate = '';
		for (const line of lines) {
			if (line.match(/^[0-9a-f]{40}/)) {
				currentDate = line.split(' ').slice(1).join(' ');
			} else if (line.trim() && line.startsWith('src/')) {
				const existing = stats.get(line);
				if (existing) {
					existing.changes++;
					if (new Date(currentDate) > new Date(existing.lastChanged)) {
						existing.lastChanged = currentDate;
					}
				} else {
					stats.set(line, { changes: 1, lastChanged: currentDate });
				}
			}
		}
	} catch {
		// git not available
	}
	return stats;
}

function detectCircularDeps(files: FileNode[]): string[][] {
	const graph = new Map<string, string[]>();
	for (const f of files) {
		graph.set(f.relativePath, f.imports);
	}

	const cycles: string[][] = [];
	const visited = new Set<string>();
	const inStack = new Set<string>();

	function dfs(node: string, path: string[]) {
		if (inStack.has(node)) {
			const cycleStart = path.indexOf(node);
			if (cycleStart >= 0) {
				cycles.push(path.slice(cycleStart));
			}
			return;
		}
		if (visited.has(node)) return;
		visited.add(node);
		inStack.add(node);
		path.push(node);

		const deps = graph.get(node) || [];
		for (const dep of deps) {
			dfs(dep, [...path]);
		}
		inStack.delete(node);
	}

	for (const file of files) {
		dfs(file.relativePath, []);
	}

	return cycles;
}

function computeLayerDeps(files: FileNode[]): Map<Layer, Set<Layer>> {
	const deps = new Map<Layer, Set<Layer>>();
	const fileMap = new Map<string, FileNode>();
	for (const f of files) {
		fileMap.set(f.relativePath.replace('src/', '').replace('.ts', ''), f);
	}

	for (const f of files) {
		if (!deps.has(f.layer)) deps.set(f.layer, new Set());
		for (const imp of f.imports) {
			const impFile = fileMap.get(imp.replace('src/', '').replace('.ts', ''));
			if (impFile && impFile.layer !== f.layer) {
				deps.get(f.layer)!.add(impFile.layer);
			}
		}
	}
	return deps;
}

function countReverseDeps(files: FileNode[]): Record<string, number> {
	const counts: Record<string, number> = {};
	const fileMap = new Map<string, FileNode>();
	for (const f of files) {
		fileMap.set(f.relativePath.replace('src/', '').replace('.ts', ''), f);
	}
	for (const f of files) {
		for (const imp of f.imports) {
			const impFile = fileMap.get(imp.replace('src/', '').replace('.ts', ''));
			if (impFile) {
				counts[impFile.relativePath] = (counts[impFile.relativePath] || 0) + 1;
			}
		}
	}
	return counts;
}

export function analyzeArchitecture(): ArchitectureResult {
	// Check cache
	if (architectureCache && Date.now() - architectureCache.timestamp < CACHE_TTL) {
		return architectureCache.result;
	}

	const root = findRepoRoot();
	const srcDir = join(root, 'src');
	const allFiles = getAllTsFiles(srcDir, root);
	const gitStats = getGitChangeStats(root);

	const fileNodes: FileNode[] = [];
	let totalImports = 0;

	for (const fullPath of allFiles) {
		const relPath = relative(root, fullPath);
		const content = readFileSync(fullPath, 'utf-8');
		const resolvedImports = parseImports(content)
			.map((imp) => resolveImport(imp, root))
			.filter((r): r is string => r !== null);

		totalImports += resolvedImports.length;

		fileNodes.push({
			relativePath: relPath,
			layer: detectLayer(relPath),
			imports: resolvedImports,
			lineCount: content.split('\n').length,
		});
	}

	const layers: LayerInfo[] = [];
	for (const [layer, deps] of computeLayerDeps(fileNodes)) {
		layers.push({
			name: layer,
			files: fileNodes.filter((f) => f.layer === layer).map((f) => f.relativePath),
			dependsOn: [...deps],
		});
	}

	const hotModules: HotModule[] = [];
	for (const [path, stats] of gitStats) {
		if (path.startsWith('src/')) {
			hotModules.push({ path, changes: stats.changes, lastChanged: stats.lastChanged });
		}
	}
	hotModules.sort((a, b) => b.changes - a.changes);

	const result: ArchitectureResult = {
		files: fileNodes,
		layers,
		hotModules: hotModules.slice(0, 10),
		circularDeps: detectCircularDeps(fileNodes),
		reverseDeps: countReverseDeps(fileNodes),
		stats: {
			totalFiles: fileNodes.length,
			totalImports,
		},
		overviewGraph: OVERVIEW_GRAPH,
	};

	// Update cache
	architectureCache = { result, timestamp: Date.now() };

	return result;
}
