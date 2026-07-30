import { s as searchMemory, l as listMemory, c as createMemory } from '../../../../chunks/memory.js-Bo9rRBoq.js';
import { j as json, v as error } from '../../../../chunks/utils.js-DmH4fUUI.js';
import '../../../../chunks/repo.js-CKpiBgM0.js';
import 'fs';
import 'path';
import 'url';
import 'sql.js';
import '../../../../chunks/shared.js-BzvQRZqT.js';
import '../../../../chunks/index-server.js-BdNQyuwB.js';
import 'clsx';

//#region src/routes/api/memory/+server.ts
var GET = async ({ url }) => {
	const category = url.searchParams.get("category");
	const query = url.searchParams.get("q");
	if (query) {
		const results = await searchMemory(query);
		return json({
			entries: results,
			total: results.length
		});
	}
	const entries = await listMemory(category ?? void 0);
	return json({
		entries,
		total: entries.length
	});
};
var POST = async ({ request }) => {
	const body = await request.json();
	if (!body.title || !body.category) error(400, "title and category are required");
	return json(await createMemory(body), { status: 201 });
};

export { GET, POST };
//# sourceMappingURL=_server.ts.js-CxsA_XaR.js.map
