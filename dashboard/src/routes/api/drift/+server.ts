import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeDrift } from '$lib/server/drift.js';

export const GET: RequestHandler = async () => {
	const result = analyzeDrift();
	return json(result);
};
