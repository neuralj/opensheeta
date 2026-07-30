import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeHealth } from '$lib/server/health.js';

export const GET: RequestHandler = async () => {
	const result = analyzeHealth();
	return json(result);
};
