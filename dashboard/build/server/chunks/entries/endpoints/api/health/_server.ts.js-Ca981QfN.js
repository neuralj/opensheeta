import { a as analyzeHealth } from '../../../../chunks/health.js-Dl6V4OGP.js';
import { j as json } from '../../../../chunks/utils.js-DmH4fUUI.js';
import '../../../../chunks/repo.js-CKpiBgM0.js';
import 'fs';
import 'path';
import 'url';
import 'child_process';
import '../../../../chunks/shared.js-BzvQRZqT.js';
import '../../../../chunks/index-server.js-BdNQyuwB.js';
import 'clsx';

//#region src/routes/api/health/+server.ts
var GET = async () => {
	return json(analyzeHealth());
};

export { GET };
//# sourceMappingURL=_server.ts.js-Ca981QfN.js.map
