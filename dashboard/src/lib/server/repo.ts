import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

let cachedRoot: string | null = null;

export function findRepoRoot(): string {
	if (cachedRoot) return cachedRoot;

	let dir = dirname(fileURLToPath(import.meta.url));
	for (let i = 0; i < 10; i++) {
		if (existsSync(resolve(dir, 'package.json')) && existsSync(resolve(dir, 'src/daemon.ts'))) {
			cachedRoot = dir;
			return dir;
		}
		dir = dirname(dir);
	}
	cachedRoot = process.cwd();
	return cachedRoot;
}
