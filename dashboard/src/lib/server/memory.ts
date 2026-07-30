import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { findRepoRoot } from './repo.js';

export type MemoryCategory = 'business' | 'technical' | 'architecture' | 'security' | 'performance' | 'incident' | 'lesson';

export interface MemoryEntry {
	id: string;
	category: MemoryCategory;
	title: string;
	context: string;
	decision: string;
	rationale: string;
	alternatives: string;
	created_at: number;
	author: string;
	tags: string;
	superseded_by: string | null;
}

export interface MemoryCreateInput {
	category: MemoryCategory;
	title: string;
	context: string;
	decision: string;
	rationale: string;
	alternatives?: string;
	author?: string;
	tags?: string;
}

let db: Database | null = null;

async function getDb(): Promise<Database> {
	if (db) return db;

	const root = findRepoRoot();
	const dbPath = join(root, 'memory.db');
	const SQL = await initSqlJs();

	if (existsSync(dbPath)) {
		const buffer = readFileSync(dbPath);
		db = new SQL.Database(buffer);
	} else {
		db = new SQL.Database();
	}

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

function rowToEntry(row: Record<string, unknown>): MemoryEntry {
	return {
		id: row.id as string,
		category: row.category as MemoryCategory,
		title: row.title as string,
		context: (row.context as string) ?? '',
		decision: (row.decision as string) ?? '',
		rationale: (row.rationale as string) ?? '',
		alternatives: (row.alternatives as string) ?? '',
		created_at: row.created_at as number,
		author: (row.author as string) ?? 'unknown',
		tags: (row.tags as string) ?? '',
		superseded_by: (row.superseded_by as string) ?? null,
	};
}

export async function listMemory(category?: MemoryCategory): Promise<MemoryEntry[]> {
	const d = await getDb();
	let sql = 'SELECT * FROM memory ORDER BY created_at DESC';
	const params: unknown[] = [];
	if (category) {
		sql = 'SELECT * FROM memory WHERE category = ? ORDER BY created_at DESC';
		params.push(category);
	}
	const stmt = d.prepare(sql);
	if (params.length > 0) stmt.bind(params);
	const entries: MemoryEntry[] = [];
	while (stmt.step()) {
		entries.push(rowToEntry(stmt.getAsObject() as Record<string, unknown>));
	}
	stmt.free();
	return entries;
}

export async function getMemory(id: string): Promise<MemoryEntry | null> {
	const d = await getDb();
	const stmt = d.prepare('SELECT * FROM memory WHERE id = ?');
	stmt.bind([id]);
	if (!stmt.step()) { stmt.free(); return null; }
	const row = stmt.getAsObject() as Record<string, unknown>;
	stmt.free();
	return rowToEntry(row);
}

export async function createMemory(input: MemoryCreateInput): Promise<MemoryEntry> {
	const d = await getDb();
	const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const now = Date.now();
	d.run(
		`INSERT INTO memory (id, category, title, context, decision, rationale, alternatives, created_at, author, tags, superseded_by)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[id, input.category, input.title, input.context, input.decision,
		 input.rationale, input.alternatives ?? '', now,
		 input.author ?? 'unknown', input.tags ?? '', null],
	);
	persist();
	return (await getMemory(id))!;

	function persist() {
		if (!d) return;
		const data = d.export();
		const buffer = Buffer.from(data);
		writeFileSync(join(findRepoRoot(), 'memory.db'), buffer);
	}
}

export async function updateMemory(id: string, patch: Partial<MemoryCreateInput> & { superseded_by?: string }): Promise<MemoryEntry | null> {
	const d = await getDb();
	const existing = await getMemory(id);
	if (!existing) return null;

	const sets: string[] = [];
	const params: unknown[] = [];
	for (const [key, value] of Object.entries(patch)) {
		if (value !== undefined) {
			sets.push(`${key} = ?`);
			params.push(value);
		}
	}
	if (sets.length === 0) return existing;
	params.push(id);
	d.run(`UPDATE memory SET ${sets.join(', ')} WHERE id = ?`, params);
	persist();
	return getMemory(id);

	function persist() {
		if (!d) return;
		const data = d.export();
		const buffer = Buffer.from(data);
		writeFileSync(join(findRepoRoot(), 'memory.db'), buffer);
	}
}

export async function deleteMemory(id: string): Promise<boolean> {
	const d = await getDb();
	d.run('DELETE FROM memory WHERE id = ?', [id]);
	persist();
	return true;

	function persist() {
		if (!d) return;
		const data = d.export();
		const buffer = Buffer.from(data);
		writeFileSync(join(findRepoRoot(), 'memory.db'), buffer);
	}
}

export async function searchMemory(query: string): Promise<MemoryEntry[]> {
	const d = await getDb();
	const stmt = d.prepare("SELECT * FROM memory WHERE title LIKE ? OR context LIKE ? OR decision LIKE ? OR rationale LIKE ? OR tags LIKE ? ORDER BY created_at DESC");
	const pattern = `%${query}%`;
	stmt.bind([pattern, pattern, pattern, pattern, pattern]);
	const entries: MemoryEntry[] = [];
	while (stmt.step()) {
		entries.push(rowToEntry(stmt.getAsObject() as Record<string, unknown>));
	}
	stmt.free();
	return entries;
}
