import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import initSqlJs, { type Database } from 'sql.js';
import { findRepoRoot } from './repo.js';

// Cache for timeline results
let timelineCache: { result: TimelineResult; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

export interface TimelineEntry {
	id: string;
	type: 'task' | 'commit';
	title: string;
	status: string;
	startedAt: number;
	finishedAt: number | null;
	durationMs: number;
	author: string;
	detail: string;
	filesChanged?: string[];
}

export interface TimelineResult {
	entries: TimelineEntry[];
	total: number;
}

interface GitCommit {
	hash: string;
	short: string;
	subject: string;
	author: string;
	date: string;
	files: string[];
}

function getRecentCommits(root: string, limit: number): GitCommit[] {
	try {
		const output = execSync(
			`git log --format="%H|%h|%s|%an|%ai" --name-only -${limit}`,
			{ cwd: root, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
		);
		const commits: GitCommit[] = [];
		const lines = output.split('\n');
		let current: GitCommit | null = null;

		for (const line of lines) {
			if (line.includes('|') && line.match(/^[0-9a-f]{40}\|/)) {
				if (current) commits.push(current);
				const parts = line.split('|');
				current = {
					hash: parts[0],
					short: parts[1],
					subject: parts[2],
					author: parts[3],
					date: parts[4],
					files: [],
				};
			} else if (line.trim() && current) {
				current.files.push(line.trim());
			}
		}
		if (current) commits.push(current);
		return commits;
	} catch {
		return [];
	}
}

async function getTaskHistory(root: string): Promise<TimelineEntry[]> {
	const dbPath = join(root, 'tasks.db');
	if (!existsSync(dbPath)) return [];

	const SQL = await initSqlJs();
	const buffer = readFileSync(dbPath);
	const db: Database = new SQL.Database(buffer);

	const entries: TimelineEntry[] = [];
	try {
		const stmt = db.prepare("SELECT * FROM tasks WHERE status IN ('completed', 'failed') ORDER BY updated_at DESC LIMIT 50");
		while (stmt.step()) {
			const row = stmt.getAsObject() as Record<string, unknown>;
			const createdAt = row.created_at as number;
			const updatedAt = row.updated_at as number;
			entries.push({
				id: `task_${row.id}`,
				type: 'task',
				title: (row.prompt as string).slice(0, 120),
				status: row.status as string,
				startedAt: createdAt,
				finishedAt: updatedAt,
				durationMs: updatedAt - createdAt,
				author: 'agent',
				detail: `Task ${row.id} — ${(row.prompt as string).slice(0, 200)}`,
			});
		}
		stmt.free();
	} catch {
		// table might not exist
	}

	return entries;
}

export async function getTimeline(limit: number = 50): Promise<TimelineResult> {
	// Check cache first
	if (timelineCache && Date.now() - timelineCache.timestamp < CACHE_TTL) {
		return timelineCache.result;
	}

	const root = findRepoRoot();

	const [taskEntries, commits] = await Promise.all([
		getTaskHistory(root),
		Promise.resolve(getRecentCommits(root, limit)),
	]);

	const commitEntries: TimelineEntry[] = commits.map((c) => ({
		id: `commit_${c.hash}`,
		type: 'commit' as const,
		title: c.subject,
		status: 'merged',
		startedAt: new Date(c.date).getTime(),
		finishedAt: new Date(c.date).getTime(),
		durationMs: 0,
		author: c.author,
		detail: `${c.short} — ${c.subject}`,
		filesChanged: c.files,
	}));

	const all = [...taskEntries, ...commitEntries];
	all.sort((a, b) => b.startedAt - a.startedAt);

	const result = {
		entries: all.slice(0, limit),
		total: all.length,
	};

	// Update cache
	timelineCache = { result, timestamp: Date.now() };

	return result;
}
