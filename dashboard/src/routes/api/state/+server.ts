import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoState } from '$lib/server/state.js';

export const GET: RequestHandler = async () => {
	const state = await getRepoState();
	return json(state);
};
