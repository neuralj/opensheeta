import { analyzeArchitecture, type FileNode, type Layer } from './architecture.js';

let driftCache: { result: DriftResult; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

export interface DriftViolation {
	from: string;
	fromLayer: Layer;
	to: string;
	toLayer: Layer;
	reason: string;
}

export interface DriftResult {
	score: number;
	violations: DriftViolation[];
	expectedRules: string[];
	summary: {
		totalDeps: number;
		validDeps: number;
		invalidDeps: number;
	};
}

const LAYER_ORDER: Layer[] = ['types', 'shared', 'config', 'adapter', 'handler', 'endpoint', 'scheduler'];

const ALLOWED_DEPS: Record<string, Layer[]> = {
	scheduler: ['handler', 'adapter', 'config', 'types', 'shared'],
	endpoint: ['handler', 'config', 'types', 'shared'],
	handler: ['adapter', 'config', 'types', 'shared'],
	adapter: ['config', 'types', 'shared'],
	config: ['types', 'shared'],
	types: ['shared'],
	shared: [],
	other: [],
};

const EXPECTED_RULES = [
	'Scheduler → Handler, Adapter',
	'Endpoint → Handler',
	'Handler → Adapter',
	'Adapter → Config, Types, Shared (no upward deps)',
	'Config → Types, Shared',
	'Types → Shared',
];

export function analyzeDrift(): DriftResult {
	if (driftCache && Date.now() - driftCache.timestamp < CACHE_TTL) {
		return driftCache.result;
	}

	const arch = analyzeArchitecture();
	const fileMap = new Map<string, FileNode>();
	for (const f of arch.files) {
		const key = f.relativePath.replace('src/', '').replace('.ts', '');
		fileMap.set(key, f);
	}

	const violations: DriftViolation[] = [];
	let totalDeps = 0;
	let invalidDeps = 0;

	for (const f of arch.files) {
		for (const imp of f.imports) {
			const key = imp.replace('src/', '').replace('.ts', '');
			const impFile = fileMap.get(key);
			if (!impFile) continue;
			if (impFile.layer === f.layer) continue;

			totalDeps++;

			const allowed = ALLOWED_DEPS[f.layer] || [];
			if (!allowed.includes(impFile.layer)) {
				invalidDeps++;
				const fromIdx = LAYER_ORDER.indexOf(f.layer);
				const toIdx = LAYER_ORDER.indexOf(impFile.layer);
				const direction = toIdx > fromIdx ? 'downward' : 'upward';

				violations.push({
					from: f.relativePath,
					fromLayer: f.layer,
					to: impFile.relativePath,
					toLayer: impFile.layer,
					reason: `${f.layer} → ${impFile.layer} (${direction}, not allowed)`,
				});
			}
		}
	}

	const validDeps = totalDeps - invalidDeps;
	const score = totalDeps > 0 ? Math.round((validDeps / totalDeps) * 100) : 100;

	const result: DriftResult = {
		score,
		violations,
		expectedRules: EXPECTED_RULES,
		summary: {
			totalDeps,
			validDeps,
			invalidDeps,
		},
	};

	driftCache = { result, timestamp: Date.now() };
	return result;
}
