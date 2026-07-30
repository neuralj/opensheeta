import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import { findRepoRoot } from './repo.js';

let qualityCache: { result: QualityResult; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

export interface FileQuality {
	path: string;
	lines: number;
	functions: number;
	hasTest: boolean;
	testPath: string | null;
}

export interface QualityResult {
	abstractionDensity: number;
	testCoverage: number;
	totalFiles: number;
	filesWithTests: number;
	totalFunctions: number;
	totalLines: number;
	files: FileQuality[];
}

function countFunctions(content: string): number {
	const patterns = [
		/export\s+(async\s+)?function\s+\w+/g,
		/export\s+(const|let)\s+\w+\s*=\s*(async\s+)?\(/g,
		/export\s+(const|let)\s+\w+\s*=\s*(async\s+)?function/g,
		/^\s*(async\s+)?function\s+\w+/gm,
		/^\s*(const|let)\s+\w+\s*=\s*(async\s+)?\(/gm,
	];

	let count = 0;
	const seen = new Set<string>();

	for (const pattern of patterns) {
		const matches = content.match(pattern) || [];
		for (const m of matches) {
			const nameMatch = m.match(/(?:function\s+|=\s*)(\w+)/);
			if (nameMatch && !seen.has(nameMatch[1])) {
				seen.add(nameMatch[1]);
				count++;
			}
		}
	}

	return count;
}

function findTestFile(srcPath: string, root: string): string | null {
	const rel = relative(join(root, 'src'), srcPath);
	const dir = join(root, 'tests');
	const base = basename(srcPath, '.ts');
	const candidates = [
		join(dir, `${base}.test.ts`),
		join(dir, `${base}.spec.ts`),
	];

	for (const c of candidates) {
		if (existsSync(c)) return relative(root, c);
	}
	return null;
}

function getAllTsFiles(dir: string, root: string): string[] {
	const files: string[] = [];
	try {
		const entries = readdirSync(dir);
		for (const entry of entries) {
			if (entry.startsWith('.') || entry === 'node_modules') continue;
			const full = join(dir, entry);
			try {
				const stat = statSync(full);
				if (stat.isDirectory()) {
					files.push(...getAllTsFiles(full, root));
				} else if (stat.isFile() && extname(entry) === '.ts') {
					files.push(full);
				}
			} catch {}
		}
	} catch {}
	return files;
}

export function analyzeQuality(): QualityResult {
	if (qualityCache && Date.now() - qualityCache.timestamp < CACHE_TTL) {
		return qualityCache.result;
	}

	const root = findRepoRoot();
	const srcDir = join(root, 'src');
	const allFiles = getAllTsFiles(srcDir, root);

	const files: FileQuality[] = [];
	let totalFunctions = 0;
	let totalLines = 0;
	let filesWithTests = 0;

	for (const fullPath of allFiles) {
		const relPath = relative(root, fullPath);
		if (relPath.includes('.d.ts') || relPath.includes('.test.') || relPath.includes('.spec.')) continue;

		const content = readFileSync(fullPath, 'utf-8');
		const lines = content.split('\n').length;
		const functions = countFunctions(content);
		const testPath = findTestFile(fullPath, root);

		if (testPath) filesWithTests++;
		totalFunctions += functions;
		totalLines += lines;

		files.push({
			path: relPath,
			lines,
			functions,
			hasTest: !!testPath,
			testPath,
		});
	}

	const totalFiles = files.length;
	const abstractionDensity = totalFiles > 0 ? totalFunctions / totalFiles : 0;
	const testCoverage = totalFiles > 0 ? filesWithTests / totalFiles : 0;

	const result: QualityResult = {
		abstractionDensity: Math.round(abstractionDensity * 100) / 100,
		testCoverage: Math.round(testCoverage * 100) / 100,
		totalFiles,
		filesWithTests,
		totalFunctions,
		totalLines,
		files: files.sort((a, b) => a.path.localeCompare(b.path)),
	};

	qualityCache = { result, timestamp: Date.now() };
	return result;
}
