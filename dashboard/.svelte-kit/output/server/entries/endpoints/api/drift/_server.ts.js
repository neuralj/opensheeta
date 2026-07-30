import { t as analyzeArchitecture } from "../../../../chunks/architecture.js";
import { json } from "@sveltejs/kit";
//#region src/lib/server/drift.ts
var driftCache = null;
var CACHE_TTL = 60 * 1e3;
var LAYER_ORDER = [
	"types",
	"shared",
	"config",
	"adapter",
	"handler",
	"endpoint",
	"scheduler"
];
var ALLOWED_DEPS = {
	scheduler: [
		"handler",
		"adapter",
		"config",
		"types",
		"shared"
	],
	endpoint: [
		"handler",
		"config",
		"types",
		"shared"
	],
	handler: [
		"adapter",
		"config",
		"types",
		"shared"
	],
	adapter: [
		"config",
		"types",
		"shared"
	],
	config: ["types", "shared"],
	types: ["shared"],
	shared: [],
	other: []
};
var EXPECTED_RULES = [
	"Scheduler → Handler, Adapter",
	"Endpoint → Handler",
	"Handler → Adapter",
	"Adapter → Config, Types, Shared (no upward deps)",
	"Config → Types, Shared",
	"Types → Shared"
];
function analyzeDrift() {
	if (driftCache && Date.now() - driftCache.timestamp < CACHE_TTL) return driftCache.result;
	const arch = analyzeArchitecture();
	const fileMap = /* @__PURE__ */ new Map();
	for (const f of arch.files) {
		const key = f.relativePath.replace("src/", "").replace(".ts", "");
		fileMap.set(key, f);
	}
	const violations = [];
	let totalDeps = 0;
	let invalidDeps = 0;
	for (const f of arch.files) for (const imp of f.imports) {
		const key = imp.replace("src/", "").replace(".ts", "");
		const impFile = fileMap.get(key);
		if (!impFile) continue;
		if (impFile.layer === f.layer) continue;
		totalDeps++;
		if (!(ALLOWED_DEPS[f.layer] || []).includes(impFile.layer)) {
			invalidDeps++;
			const fromIdx = LAYER_ORDER.indexOf(f.layer);
			const direction = LAYER_ORDER.indexOf(impFile.layer) > fromIdx ? "downward" : "upward";
			violations.push({
				from: f.relativePath,
				fromLayer: f.layer,
				to: impFile.relativePath,
				toLayer: impFile.layer,
				reason: `${f.layer} → ${impFile.layer} (${direction}, not allowed)`
			});
		}
	}
	const validDeps = totalDeps - invalidDeps;
	const result = {
		score: totalDeps > 0 ? Math.round(validDeps / totalDeps * 100) : 100,
		violations,
		expectedRules: EXPECTED_RULES,
		summary: {
			totalDeps,
			validDeps,
			invalidDeps
		}
	};
	driftCache = {
		result,
		timestamp: Date.now()
	};
	return result;
}
//#endregion
//#region src/routes/api/drift/+server.ts
var GET = async () => {
	return json(analyzeDrift());
};
//#endregion
export { GET };
