import { f as findRepoRoot } from '../../../../chunks/repo.js-CKpiBgM0.js';
import { j as json } from '../../../../chunks/utils.js-DmH4fUUI.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import 'url';
import '../../../../chunks/shared.js-BzvQRZqT.js';
import '../../../../chunks/index-server.js-BdNQyuwB.js';
import 'clsx';

//#region src/routes/api/services/+server.ts
function parsePlist(plistPath) {
	try {
		const content = readFileSync(plistPath, "utf-8");
		const labelMatch = content.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
		if (!labelMatch) return null;
		const label = labelMatch[1];
		const portMatch = content.match(/<key>(?:OS_)?PORT<\/key>\s*<string>(\d+)<\/string>/);
		const port = portMatch ? parseInt(portMatch[1]) : 0;
		const logMatch = content.match(/<key>StandardOutPath<\/key>\s*<string>([^<]+)<\/string>/);
		return {
			label,
			port,
			logPath: logMatch ? logMatch[1] : ""
		};
	} catch {
		return null;
	}
}
function getLaunchctlStatus(label) {
	try {
		const parts = execSync(`launchctl list | grep "^${label}"`, { encoding: "utf-8" }).trim().split(/\s+/);
		if (parts.length >= 3) {
			const pid = parts[0] === "-" ? null : parseInt(parts[0]);
			return {
				running: pid !== null,
				pid
			};
		}
	} catch {}
	return {
		running: false,
		pid: null
	};
}
function readLogTail(logPath, lines = 30) {
	if (!logPath || !existsSync(logPath)) return [];
	try {
		return readFileSync(logPath, "utf-8").split("\n").slice(-lines).filter((l) => l.trim());
	} catch {
		return [];
	}
}
var GET = async () => {
	const scriptsDir = join(findRepoRoot(), "scripts");
	const services = [];
	try {
		const plistFiles = execSync(`ls ${scriptsDir}/com.neuralj.*.plist 2>/dev/null || true`, { encoding: "utf-8" }).trim().split("\n").filter((f) => f);
		for (const plistPath of plistFiles) {
			const parsed = parsePlist(plistPath);
			if (!parsed) continue;
			const name = parsed.label.replace("com.neuralj.", "");
			const status = getLaunchctlStatus(parsed.label);
			const logTail = readLogTail(parsed.logPath);
			services.push({
				name,
				status: status.running ? "running" : "not_loaded",
				port: parsed.port,
				pid: status.pid,
				logPath: parsed.logPath,
				logTail
			});
		}
	} catch {}
	return json({ services });
};

export { GET };
//# sourceMappingURL=_server.ts.js-C959Sjdq.js.map
