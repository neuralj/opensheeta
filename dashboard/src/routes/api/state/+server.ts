import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoState } from '$lib/server/state.js';

export const GET: RequestHandler = async ({ url }) => {
	const force = url.searchParams.get('refresh') === '1';
	const state = await getRepoState({ force });
	return json(state);
};
