import { g as getTimeline } from '../../../../chunks/timeline.js-bDiasbG6.js';
import { j as json } from '../../../../chunks/utils.js-DunYfjcG.js';
import '../../../../chunks/repo.js-CKpiBgM0.js';
import 'fs';
import 'path';
import 'url';
import 'child_process';
import 'sql.js';
import '../../../../chunks/shared.js-BgNmPjOs.js';
import '../../../../chunks/index-server.js-B2n26aNO.js';
import 'clsx';

//#region src/routes/api/timeline/+server.ts
var GET = async ({ url }) => {
	return json(await getTimeline(parseInt(url.searchParams.get("limit") ?? "50")));
};

export { GET };
//# sourceMappingURL=_server.ts.js-B8-nvSeS.js.map
