import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeArchitecture } from '$lib/server/architecture.js';

export const GET: RequestHandler = async () => {
	const result = analyzeArchitecture();
	return json(result);
};
