import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTimeline } from '$lib/server/timeline.js';

export const GET: RequestHandler = async ({ url }) => {
	const limit = parseInt(url.searchParams.get('limit') ?? '50');
	const result = await getTimeline(limit);
	return json(result);
};
