import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listMemory, createMemory, searchMemory, type MemoryCategory } from '$lib/server/memory.js';

export const GET: RequestHandler = async ({ url }) => {
	const category = url.searchParams.get('category') as MemoryCategory | null;
	const query = url.searchParams.get('q');

	if (query) {
		const results = await searchMemory(query);
		return json({ entries: results, total: results.length });
	}

	const entries = await listMemory(category ?? undefined);
	return json({ entries, total: entries.length });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	if (!body.title || !body.category) {
		error(400, 'title and category are required');
	}
	const entry = await createMemory(body);
	return json(entry, { status: 201 });
};
