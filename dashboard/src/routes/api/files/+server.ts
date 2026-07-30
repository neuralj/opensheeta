import { json } from '@sveltejs/kit';
import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { findRepoRoot } from '$lib/server/repo';

const REPO_ROOT = findRepoRoot();

export async function GET({ url }) {
	const path = url.searchParams.get('path') || '';
	const action = url.searchParams.get('action') || 'list';

	try {
		if (action === 'content') {
			const fullPath = resolve(join(REPO_ROOT, path));
			if (!fullPath.startsWith(REPO_ROOT)) {
				return json({ error: 'Access denied' }, { status: 403 });
			}
			const content = await readFile(fullPath, 'utf-8');
			return json({ content, path });
		}

		const fullPath = resolve(join(REPO_ROOT, path));
		if (!fullPath.startsWith(REPO_ROOT)) {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		const entries = await readdir(fullPath, { withFileTypes: true });
		const items = await Promise.all(
			entries
				.filter((e: { name: string }) => !e.name.startsWith('.'))
				.map(async (e: { name: string; isDirectory: () => boolean }) => {
					const itemPath = join(path, e.name);
					const s = await stat(join(fullPath, e.name)).catch(() => null);
					return {
						name: e.name,
						path: itemPath,
						isDirectory: e.isDirectory(),
						size: s?.size || 0
					};
				})
		);
		items.sort((a: { isDirectory: boolean; name: string }, b: { isDirectory: boolean; name: string }) => {
			if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
		return json({ items, path });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
