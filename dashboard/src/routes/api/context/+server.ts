import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getContextSnapshot } from '$lib/server/state.js';

export const GET: RequestHandler = async () => {
	const snapshot = await getContextSnapshot();
	return json(snapshot);
};
