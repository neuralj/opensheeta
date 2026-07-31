export type Layer = 'scheduler' | 'endpoint' | 'handler' | 'adapter' | 'config' | 'types' | 'shared' | 'other';

export type CIStatusType = 'passing' | 'failing' | 'pending' | 'unknown';

export interface FileNode {
	relativePath: string;
	layer: Layer;
	imports: string[];
	lineCount: number;
}

export interface LayerInfo {
	name: Layer;
	files: string[];
	dependsOn: Layer[];
}

export interface HotModule {
	path: string;
	changes: number;
	lastChanged: string;
}

export interface ArchitectureResult {
	files: FileNode[];
	layers: LayerInfo[];
	hotModules: HotModule[];
	circularDeps: string[][];
	reverseDeps: Record<string, number>;
	stats: {
		totalFiles: number;
		totalImports: number;
	};
	overviewGraph: string;
}

export interface RepoState {
	repo: {
		name: string;
		branch: string;
		totalCommits: number;
		lastCommit: { hash: string; message: string; date: string; author: string };
	};
	architecture: {
		totalFiles: number;
		totalImports: number;
		layerCounts: Record<string, number>;
		hotModules: { path: string; changes: number }[];
	};
	ci: {
		latestStatus: CIStatusType;
		totalRuns: number;
	};
}

export interface CIStatus {
	runs: WorkflowRun[];
	latestStatus: CIStatusType;
}

export interface WorkflowRun {
	id: number;
	name: string;
	status: string;
	conclusion: string | null;
	created_at: string;
	updated_at: string;
	head_branch: string;
	head_sha: string;
	html_url: string;
	run_number: number;
	event: string;
}
