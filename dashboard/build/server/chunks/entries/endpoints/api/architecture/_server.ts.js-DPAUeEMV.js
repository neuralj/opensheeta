import { a as analyzeArchitecture } from '../../../../chunks/architecture.js-CsbP7I0I.js';
import { j as json } from '../../../../chunks/utils.js-DmH4fUUI.js';
import '../../../../chunks/repo.js-CKpiBgM0.js';
import 'fs';
import 'path';
import 'url';
import 'child_process';
import '../../../../chunks/shared.js-BzvQRZqT.js';
import '../../../../chunks/index-server.js-BdNQyuwB.js';
import 'clsx';

//#region src/routes/api/architecture/+server.ts
var GET = async () => {
	return json(analyzeArchitecture());
};

export { GET };
//# sourceMappingURL=_server.ts.js-DPAUeEMV.js.map
