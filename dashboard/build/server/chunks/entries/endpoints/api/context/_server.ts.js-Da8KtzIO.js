import { g as getContextSnapshot } from '../../../../chunks/state.js-DGFZt7wZ.js';
import { j as json } from '../../../../chunks/utils.js-DmrlFl-H.js';
import '../../../../chunks/repo.js-CKpiBgM0.js';
import 'fs';
import 'path';
import 'url';
import '../../../../chunks/architecture.js-CauFPUHb.js';
import 'child_process';
import '../../../../chunks/shared.js-BkkpcJWy.js';
import '../../../../chunks/index-server.js-CKeFhT4V.js';
import 'clsx';

//#region src/routes/api/context/+server.ts
var GET = async () => {
	return json(await getContextSnapshot());
};

export { GET };
//# sourceMappingURL=_server.ts.js-Da8KtzIO.js.map
