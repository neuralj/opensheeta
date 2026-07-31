import { json } from '@sveltejs/kit';
import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { findRepoRoot } from '$lib/server/repo';

const REPO_ROOT = findRepoRoot();

function safePath(path: string): string | null {
	const fullPath = resolve(join(REPO_ROOT, path));
	return fullPath.startsWith(REPO_ROOT) ? fullPath : null;
}

export async function GET({ url }) {
	const path = url.searchParams.get('path') || '';
	const action = url.searchParams.get('action') || 'list';

	try {
		const fullPath = safePath(path);
		if (!fullPath) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		if (action === 'content') {
			const content = await readFile(fullPath, 'utf-8');
			return json({ content, path });
		}

		const entries = await readdir(fullPath, { withFileTypes: true });
		const items = await Promise.all(
			entries
				.filter((e) => !e.name.startsWith('.'))
				.map(async (e) => {
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
		items.sort((a, b) => {
			if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
		return json({ items, path });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
