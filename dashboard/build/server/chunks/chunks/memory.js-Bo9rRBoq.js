import { f as findRepoRoot } from './repo.js-CKpiBgM0.js';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import initSqlJs from 'sql.js';

//#region src/lib/server/memory.ts
var db = null;
async function getDb() {
	if (db) return db;
	const dbPath = join(findRepoRoot(), "memory.db");
	const SQL = await initSqlJs();
	if (existsSync(dbPath)) {
		const buffer = readFileSync(dbPath);
		db = new SQL.Database(buffer);
	} else db = new SQL.Database();
	db.run(`
		CREATE TABLE IF NOT EXISTS memory (
			id TEXT PRIMARY KEY,
			category TEXT NOT NULL DEFAULT 'technical',
			title TEXT NOT NULL,
			context TEXT NOT NULL DEFAULT '',
			decision TEXT NOT NULL DEFAULT '',
			rationale TEXT NOT NULL DEFAULT '',
			alternatives TEXT NOT NULL DEFAULT '',
			created_at INTEGER NOT NULL,
			author TEXT NOT NULL DEFAULT 'unknown',
			tags TEXT NOT NULL DEFAULT '',
			superseded_by TEXT
		)
	`);
	persist();
	return db;
	function persist() {
		if (!db) return;
		const data = db.export();
		const buffer = Buffer.from(data);
		writeFileSync(dbPath, buffer);
	}
}
function rowToEntry(row) {
	return {
		id: row.id,
		category: row.category,
		title: row.title,
		context: row.context ?? "",
		decision: row.decision ?? "",
		rationale: row.rationale ?? "",
		alternatives: row.alternatives ?? "",
		created_at: row.created_at,
		author: row.author ?? "unknown",
		tags: row.tags ?? "",
		superseded_by: row.superseded_by ?? null
	};
}
async function listMemory(category) {
	const d = await getDb();
	let sql = "SELECT * FROM memory ORDER BY created_at DESC";
	const params = [];
	if (category) {
		sql = "SELECT * FROM memory WHERE category = ? ORDER BY created_at DESC";
		params.push(category);
	}
	const stmt = d.prepare(sql);
	if (params.length > 0) stmt.bind(params);
	const entries = [];
	while (stmt.step()) entries.push(rowToEntry(stmt.getAsObject()));
	stmt.free();
	return entries;
}
async function getMemory(id) {
	const stmt = (await getDb()).prepare("SELECT * FROM memory WHERE id = ?");
	stmt.bind([id]);
	if (!stmt.step()) {
		stmt.free();
		return null;
	}
	const row = stmt.getAsObject();
	stmt.free();
	return rowToEntry(row);
}
async function createMemory(input) {
	const d = await getDb();
	const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const now = Date.now();
	d.run(`INSERT INTO memory (id, category, title, context, decision, rationale, alternatives, created_at, author, tags, superseded_by)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
		id,
		input.category,
		input.title,
		input.context,
		input.decision,
		input.rationale,
		input.alternatives ?? "",
		now,
		input.author ?? "unknown",
		input.tags ?? "",
		null
	]);
	persist();
	return await getMemory(id);
	function persist() {
		if (!d) return;
		const data = d.export();
		const buffer = Buffer.from(data);
		writeFileSync(join(findRepoRoot(), "memory.db"), buffer);
	}
}
async function updateMemory(id, patch) {
	const d = await getDb();
	const existing = await getMemory(id);
	if (!existing) return null;
	const sets = [];
	const params = [];
	for (const [key, value] of Object.entries(patch)) if (value !== void 0) {
		sets.push(`${key} = ?`);
		params.push(value);
	}
	if (sets.length === 0) return existing;
	params.push(id);
	d.run(`UPDATE memory SET ${sets.join(", ")} WHERE id = ?`, params);
	persist();
	return getMemory(id);
	function persist() {
		if (!d) return;
		const data = d.export();
		const buffer = Buffer.from(data);
		writeFileSync(join(findRepoRoot(), "memory.db"), buffer);
	}
}
async function deleteMemory(id) {
	const d = await getDb();
	d.run("DELETE FROM memory WHERE id = ?", [id]);
	persist();
	return true;
	function persist() {
		if (!d) return;
		const data = d.export();
		const buffer = Buffer.from(data);
		writeFileSync(join(findRepoRoot(), "memory.db"), buffer);
	}
}
async function searchMemory(query) {
	const stmt = (await getDb()).prepare("SELECT * FROM memory WHERE title LIKE ? OR context LIKE ? OR decision LIKE ? OR rationale LIKE ? OR tags LIKE ? ORDER BY created_at DESC");
	const pattern = `%${query}%`;
	stmt.bind([
		pattern,
		pattern,
		pattern,
		pattern,
		pattern
	]);
	const entries = [];
	while (stmt.step()) entries.push(rowToEntry(stmt.getAsObject()));
	stmt.free();
	return entries;
}

export { createMemory as c, deleteMemory as d, getMemory as g, listMemory as l, searchMemory as s, updateMemory as u };
//# sourceMappingURL=memory.js-Bo9rRBoq.js.map
