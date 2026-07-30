import { g as getContextSnapshot } from '../../../../chunks/state.js-BZMEB3HD.js';
import { j as json } from '../../../../chunks/utils.js-DunYfjcG.js';
import '../../../../chunks/repo.js-CKpiBgM0.js';
import 'fs';
import 'path';
import 'url';
import '../../../../chunks/architecture.js-CauFPUHb.js';
import 'child_process';
import '../../../../chunks/health.js-Dl6V4OGP.js';
import '../../../../chunks/memory.js-Bo9rRBoq.js';
import 'sql.js';
import '../../../../chunks/timeline.js-bDiasbG6.js';
import '../../../../chunks/shared.js-BgNmPjOs.js';
import '../../../../chunks/index-server.js-B2n26aNO.js';
import 'clsx';

//#region src/routes/api/context/+server.ts
var GET = async () => {
	return json(await getContextSnapshot());
};

export { GET };
//# sourceMappingURL=_server.ts.js-WSR8xdfH.js.map
