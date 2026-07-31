import { f as findRepoRoot } from '../../../../chunks/repo.js-CKpiBgM0.js';
import { j as json } from '../../../../chunks/utils.js-DmrlFl-H.js';
import { resolve, join } from 'path';
import { readFile, readdir, stat } from 'fs/promises';
import 'fs';
import 'url';
import '../../../../chunks/shared.js-BkkpcJWy.js';
import '../../../../chunks/index-server.js-CKeFhT4V.js';
import 'clsx';

//#region src/routes/api/files/+server.ts
var REPO_ROOT = findRepoRoot();
async function GET({ url }) {
	const path = url.searchParams.get("path") || "";
	const action = url.searchParams.get("action") || "list";
	try {
		if (action === "content") {
			const fullPath = resolve(join(REPO_ROOT, path));
			if (!fullPath.startsWith(REPO_ROOT)) return json({ error: "Access denied" }, { status: 403 });
			return json({
				content: await readFile(fullPath, "utf-8"),
				path
			});
		}
		const fullPath = resolve(join(REPO_ROOT, path));
		if (!fullPath.startsWith(REPO_ROOT)) return json({ error: "Access denied" }, { status: 403 });
		const entries = await readdir(fullPath, { withFileTypes: true });
		const items = await Promise.all(entries.filter((e) => !e.name.startsWith(".")).map(async (e) => {
			const itemPath = join(path, e.name);
			const s = await stat(join(fullPath, e.name)).catch(() => null);
			return {
				name: e.name,
				path: itemPath,
				isDirectory: e.isDirectory(),
				size: s?.size || 0
			};
		}));
		items.sort((a, b) => {
			if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
		return json({
			items,
			path
		});
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}

export { GET };
//# sourceMappingURL=_server.ts.js-ZD2esg7J.js.map
