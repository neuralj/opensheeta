import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeChurn } from '$lib/server/churn.js';

export const GET: RequestHandler = async ({ url }) => {
	const days = parseInt(url.searchParams.get('days') || '30');
	const result = analyzeChurn(days);
	return json(result);
};
