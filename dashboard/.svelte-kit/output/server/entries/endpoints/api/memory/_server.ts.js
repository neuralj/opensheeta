import { a as searchMemory, i as listMemory, t as createMemory } from "../../../../chunks/memory.js";
import { error, json } from "@sveltejs/kit";
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
//#endregion
export { GET, POST };
