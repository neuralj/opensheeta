import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeQuality } from '$lib/server/quality.js';

export const GET: RequestHandler = async () => {
	const result = analyzeQuality();
	return json(result);
};
