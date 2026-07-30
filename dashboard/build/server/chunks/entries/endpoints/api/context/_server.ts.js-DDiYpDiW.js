import { g as getContextSnapshot } from '../../../../chunks/state.js-C3CPp8w_.js';
import { j as json } from '../../../../chunks/utils.js-DmH4fUUI.js';
import '../../../../chunks/repo.js-CKpiBgM0.js';
import 'fs';
import 'path';
import 'url';
import '../../../../chunks/architecture.js-CsbP7I0I.js';
import 'child_process';
import '../../../../chunks/health.js-Dl6V4OGP.js';
import '../../../../chunks/memory.js-Bo9rRBoq.js';
import 'sql.js';
import '../../../../chunks/timeline.js-bDiasbG6.js';
import '../../../../chunks/shared.js-BzvQRZqT.js';
import '../../../../chunks/index-server.js-BdNQyuwB.js';
import 'clsx';

//#region src/routes/api/context/+server.ts
var GET = async () => {
	return json(await getContextSnapshot());
};

export { GET };
//# sourceMappingURL=_server.ts.js-DDiYpDiW.js.map
