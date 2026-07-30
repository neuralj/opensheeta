import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMemory, updateMemory, deleteMemory } from '$lib/server/memory.js';

export const GET: RequestHandler = async ({ params }) => {
	const entry = await getMemory(params.id);
	if (!entry) {
		error(404, 'Memory entry not found');
	}
	return json(entry);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const entry = await updateMemory(params.id, body);
	if (!entry) {
		error(404, 'Memory entry not found');
	}
	return json(entry);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const success = await deleteMemory(params.id);
	if (!success) {
		error(404, 'Memory entry not found');
	}
	return json({ success: true });
};
