import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';
import { findRepoRoot } from './repo.js';

// Cache for architecture analysis results
let architectureCache: { result: ArchitectureResult; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

export interface FileNode {
	path: string;
	relativePath: string;
	layer: Layer;
	imports: string[];
	lineCount: number;
}

export type Layer = 'scheduler' | 'endpoint' | 'handler' | 'adapter' | 'config' | 'types' | 'shared' | 'other';

export interface LayerInfo {
	name: Layer;
	files: string[];
	dependsOn: Layer[];
}

export interface HotModule {
	path: string;
	changes: number;
	lastChanged: string;
}

export interface ArchitectureResult {
	files: FileNode[];
	layers: LayerInfo[];
	hotModules: HotModule[];
	circularDeps: string[][];
	stats: {
		totalFiles: number;
		totalImports: number;
		couplingScore: number;
		layerViolations: number;
	};
	mermaidGraph: string;
}

const LAYER_MAP: Record<string, Layer> = {
	'scheduler/': 'scheduler',
	'endpoints/': 'endpoint',
	'handlers/': 'handler',
	'adapters/': 'adapter',
	'config/': 'config',
	'types/': 'types',
	'shared/': 'shared',
};

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
	const candidates = [
		`src/${relative}.ts`,
		`src/${relative}/index.ts`,
	];
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
		let currentHash = '';
		let currentDate = '';
		for (const line of lines) {
			if (line.match(/^[0-9a-f]{40}/)) {
				const parts = line.split(' ');
				currentHash = parts[0];
				currentDate = parts.slice(1).join(' ');
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
	
	// Create a lookup map for faster access
	const fileMap = new Map<string, FileNode>();
	for (const f of files) {
		const key = f.relativePath.replace('src/', '').replace('.ts', '');
		fileMap.set(key, f);
	}
	
	for (const f of files) {
		if (!deps.has(f.layer)) deps.set(f.layer, new Set());
		for (const imp of f.imports) {
			const key = imp.replace('src/', '').replace('.ts', '');
			const impFile = fileMap.get(key);
			if (impFile && impFile.layer !== f.layer) {
				deps.get(f.layer)!.add(impFile.layer);
			}
		}
	}
	return deps;
}

function generateMermaidGraph(files: FileNode[], layerDeps: Map<Layer, Set<Layer>>): string {
	const lines: string[] = ['graph TD'];

	const layerColors: Record<Layer, string> = {
		scheduler: '#89b4fa',
		endpoint: '#a6e3a1',
		handler: '#f9e2af',
		adapter: '#cba6f7',
		config: '#94e2d5',
		types: '#f38ba8',
		shared: '#f5c2e7',
		other: '#6c7086',
	};

	// Create a lookup map for faster access
	const fileMap = new Map<string, FileNode>();
	for (const f of files) {
		const key = f.relativePath.replace('src/', '').replace('.ts', '');
		fileMap.set(key, f);
	}

	for (const f of files) {
		if (f.relativePath === 'src/daemon.ts') continue;
		const label = f.relativePath.replace('src/', '').replace('.ts', '');
		lines.push(`    ${f.relativePath.replace(/[^a-zA-Z0-9]/g, '_')}["${label}"]:::layer_${f.layer}`);
	}

	for (const f of files) {
		for (const imp of f.imports) {
			const key = imp.replace('src/', '').replace('.ts', '');
			const targetFile = fileMap.get(key);
			if (targetFile) {
				const from = f.relativePath.replace(/[^a-zA-Z0-9]/g, '_');
				const to = targetFile.relativePath.replace(/[^a-zA-Z0-9]/g, '_');
				lines.push(`    ${from} --> ${to}`);
			}
		}
	}

	for (const [layer, color] of Object.entries(layerColors)) {
		lines.push(`    classDef layer_${layer} fill:${color}22,stroke:${color},color:${color}`);
	}

	return lines.join('\n');
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
		const rawImports = parseImports(content);
		const resolvedImports = rawImports
			.map((imp) => resolveImport(imp, root))
			.filter((r): r is string => r !== null);

		totalImports += resolvedImports.length;

		fileNodes.push({
			path: fullPath,
			relativePath: relPath,
			layer: detectLayer(relPath),
			imports: resolvedImports,
			lineCount: content.split('\n').length,
		});
	}

	const layerDeps = computeLayerDeps(fileNodes);
	const layers: LayerInfo[] = [];
	for (const [layer, deps] of layerDeps) {
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

	const circularDeps = detectCircularDeps(fileNodes);

	const layerViolations = (() => {
		let count = 0;
		
		// Create a lookup map for faster access
		const fileMap = new Map<string, FileNode>();
		for (const f of fileNodes) {
			const key = f.relativePath.replace('src/', '').replace('.ts', '');
			fileMap.set(key, f);
		}
		
		const layerOrder: Layer[] = ['types', 'shared', 'config', 'adapter', 'handler', 'endpoint', 'scheduler'];
		
		for (const f of fileNodes) {
			for (const imp of f.imports) {
				const key = imp.replace('src/', '').replace('.ts', '');
				const impFile = fileMap.get(key);
				if (impFile) {
					const fromIdx = layerOrder.indexOf(f.layer);
					const toIdx = layerOrder.indexOf(impFile.layer);
					if (fromIdx >= 0 && toIdx >= 0 && toIdx > fromIdx + 1) count++;
				}
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
			layerViolations,
		},
		mermaidGraph: generateMermaidGraph(fileNodes, layerDeps),
	};

	// Update cache
	architectureCache = { result, timestamp: Date.now() };

	return result;
}
