import { d as deleteMemory, g as getMemory, u as updateMemory } from '../../../../../chunks/memory.js-Bo9rRBoq.js';
import { v as error, j as json } from '../../../../../chunks/utils.js-DunYfjcG.js';
import '../../../../../chunks/repo.js-CKpiBgM0.js';
import 'fs';
import 'path';
import 'url';
import 'sql.js';
import '../../../../../chunks/shared.js-BgNmPjOs.js';
import '../../../../../chunks/index-server.js-B2n26aNO.js';
import 'clsx';

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

export { DELETE, GET, PUT };
//# sourceMappingURL=_server.ts.js-BvQIgznI.js.map
