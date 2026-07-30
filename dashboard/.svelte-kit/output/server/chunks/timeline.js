import { t as findRepoRoot } from "./repo.js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import initSqlJs from "sql.js";
//#region src/lib/server/timeline.ts
var timelineCache = null;
var CACHE_TTL = 60 * 1e3;
function getRecentCommits(root, limit) {
	try {
		const output = execSync(`git log --format="%H|%h|%s|%an|%ai" --name-only -${limit}`, {
			cwd: root,
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024
		});
		const commits = [];
		const lines = output.split("\n");
		let current = null;
		for (const line of lines) if (line.includes("|") && line.match(/^[0-9a-f]{40}\|/)) {
			if (current) commits.push(current);
			const parts = line.split("|");
			current = {
				hash: parts[0],
				short: parts[1],
				subject: parts[2],
				author: parts[3],
				date: parts[4],
				files: []
			};
		} else if (line.trim() && current) current.files.push(line.trim());
		if (current) commits.push(current);
		return commits;
	} catch {
		return [];
	}
}
async function getTaskHistory(root) {
	const dbPath = join(root, "tasks.db");
	if (!existsSync(dbPath)) return [];
	const SQL = await initSqlJs();
	const buffer = readFileSync(dbPath);
	const db = new SQL.Database(buffer);
	const entries = [];
	try {
		const stmt = db.prepare("SELECT * FROM tasks WHERE status IN ('completed', 'failed') ORDER BY updated_at DESC LIMIT 50");
		while (stmt.step()) {
			const row = stmt.getAsObject();
			const createdAt = row.created_at;
			const updatedAt = row.updated_at;
			entries.push({
				id: `task_${row.id}`,
				type: "task",
				title: row.prompt.slice(0, 120),
				status: row.status,
				startedAt: createdAt,
				finishedAt: updatedAt,
				durationMs: updatedAt - createdAt,
				author: "agent",
				detail: `Task ${row.id} — ${row.prompt.slice(0, 200)}`
			});
		}
		stmt.free();
	} catch {}
	return entries;
}
async function getTimeline(limit = 50) {
	if (timelineCache && Date.now() - timelineCache.timestamp < CACHE_TTL) return timelineCache.result;
	const root = findRepoRoot();
	const [taskEntries, commits] = await Promise.all([getTaskHistory(root), Promise.resolve(getRecentCommits(root, limit))]);
	const commitEntries = commits.map((c) => ({
		id: `commit_${c.hash}`,
		type: "commit",
		title: c.subject,
		status: "merged",
		startedAt: new Date(c.date).getTime(),
		finishedAt: new Date(c.date).getTime(),
		durationMs: 0,
		author: c.author,
		detail: `${c.short} — ${c.subject}`,
		filesChanged: c.files
	}));
	const all = [...taskEntries, ...commitEntries];
	all.sort((a, b) => b.startedAt - a.startedAt);
	const result = {
		entries: all.slice(0, limit),
		total: all.length
	};
	timelineCache = {
		result,
		timestamp: Date.now()
	};
	return result;
}
//#endregion
export { getTimeline as t };
