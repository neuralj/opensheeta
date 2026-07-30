import { execSync } from 'child_process';
import { findRepoRoot } from './repo.js';

let churnCache: { result: ChurnResult; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

export interface FileChurn {
	path: string;
	added: number;
	removed: number;
	churned: number;
	churnRate: number;
	lastCommit: string;
	commitCount: number;
}

export interface DirectoryChurn {
	dir: string;
	commits: number;
	files: number;
	added: number;
	removed: number;
	churnRate: number;
}

export interface ChurnResult {
	overallChurnRate: number;
	totalAdded: number;
	totalRemoved: number;
	totalChurned: number;
	files: FileChurn[];
	directories: DirectoryChurn[];
	period: string;
}

export function analyzeChurn(days: number = 30): ChurnResult {
	if (churnCache && Date.now() - churnCache.timestamp < CACHE_TTL) {
		return churnCache.result;
	}

	const root = findRepoRoot();
	const since = `${days} days ago`;

	try {
		const output = execSync(
			`git log --since="${since}" --numstat --format="COMMIT:%H %ai" -- src/`,
			{ cwd: root, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
		);

		const fileStats = new Map<string, { added: number; removed: number; commits: Set<string>; lastCommit: string }>();
		let currentCommit = '';
		let currentDate = '';

		for (const line of output.split('\n')) {
			if (line.startsWith('COMMIT:')) {
				const parts = line.slice(7).split(' ');
				currentCommit = parts[0];
				currentDate = parts.slice(1).join(' ');
			} else if (line.trim()) {
				const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
				if (match) {
					const added = match[1] === '-' ? 0 : parseInt(match[1]);
					const removed = match[2] === '-' ? 0 : parseInt(match[2]);
					const file = match[3];

					if (file.startsWith('src/') && file.endsWith('.ts')) {
						const existing = fileStats.get(file);
						if (existing) {
							existing.added += added;
							existing.removed += removed;
							existing.commits.add(currentCommit);
							if (new Date(currentDate) > new Date(existing.lastCommit)) {
								existing.lastCommit = currentDate;
							}
						} else {
							fileStats.set(file, {
								added,
								removed,
								commits: new Set([currentCommit]),
								lastCommit: currentDate,
							});
						}
					}
				}
			}
		}

		const files: FileChurn[] = [];
		let totalAdded = 0;
		let totalRemoved = 0;
		let totalChurned = 0;

		for (const [path, stats] of fileStats) {
			const churned = Math.min(stats.added, stats.removed);
			const total = stats.added + stats.removed;
			const churnRate = total > 0 ? churned / total : 0;

			files.push({
				path,
				added: stats.added,
				removed: stats.removed,
				churned,
				churnRate,
				lastCommit: stats.lastCommit,
				commitCount: stats.commits.size,
			});

			totalAdded += stats.added;
			totalRemoved += stats.removed;
			totalChurned += churned;
		}

		files.sort((a, b) => b.churnRate - a.churnRate);

		const dirMap = new Map<string, { commits: Set<string>; files: Set<string>; added: number; removed: number; churned: number }>();

		for (const file of files) {
			const dir = file.path.split('/').slice(0, 2).join('/');
			const existing = dirMap.get(dir);
			if (existing) {
				existing.files.add(file.path);
				existing.added += file.added;
				existing.removed += file.removed;
				existing.churned += file.churned;
			} else {
				dirMap.set(dir, {
					commits: new Set(),
					files: new Set([file.path]),
					added: file.added,
					removed: file.removed,
					churned: file.churned,
				});
			}
		}

		const directories: DirectoryChurn[] = [];
		for (const [dir, stats] of dirMap) {
			const total = stats.added + stats.removed;
			directories.push({
				dir,
				commits: stats.commits.size,
				files: stats.files.size,
				added: stats.added,
				removed: stats.removed,
				churnRate: total > 0 ? stats.churned / total : 0,
			});
		}

		directories.sort((a, b) => b.churnRate - a.churnRate);

		const totalAll = totalAdded + totalRemoved;
		const overallChurnRate = totalAll > 0 ? totalChurned / totalAll : 0;

		const result: ChurnResult = {
			overallChurnRate,
			totalAdded,
			totalRemoved,
			totalChurned,
			files: files.slice(0, 20),
			directories,
			period: `${days} days`,
		};

		churnCache = { result, timestamp: Date.now() };
		return result;
	} catch {
		return {
			overallChurnRate: 0,
			totalAdded: 0,
			totalRemoved: 0,
			totalChurned: 0,
			files: [],
			directories: [],
			period: `${days} days`,
		};
	}
}
