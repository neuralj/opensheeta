import { n as deleteMemory, o as updateMemory, r as getMemory } from "../../../../../chunks/memory.js";
import { error, json } from "@sveltejs/kit";
//#region src/routes/api/memory/[id]/+server.ts
var GET = async ({ params }) => {
	const entry = await getMemory(params.id);
	if (!entry) error(404, "Memory entry not found");
	return json(entry);
};
var PUT = async ({ params, request }) => {
	const body = await request.json();
	const entry = await updateMemory(params.id, body);
	if (!entry) error(404, "Memory entry not found");
	return json(entry);
};
var DELETE = async ({ params }) => {
	if (!await deleteMemory(params.id)) error(404, "Memory entry not found");
	return json({ success: true });
};
//#endregion
export { DELETE, GET, PUT };
