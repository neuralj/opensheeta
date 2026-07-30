import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
//#region src/lib/server/repo.ts
var cachedRoot = null;
function findRepoRoot() {
	if (cachedRoot) return cachedRoot;
	let dir = dirname(fileURLToPath(import.meta.url));
	for (let i = 0; i < 10; i++) {
		if (existsSync(resolve(dir, "package.json")) && existsSync(resolve(dir, "src/daemon.ts"))) {
			cachedRoot = dir;
			return dir;
		}
		dir = dirname(dir);
	}
	cachedRoot = process.cwd();
	return cachedRoot;
}
//#endregion
export { findRepoRoot as t };
