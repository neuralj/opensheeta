declare module 'sql.js' {
	export interface Database {
		run(sql: string, params?: unknown[]): void;
		exec(sql: string, params?: unknown[]): QueryExecResult[];
		prepare(sql: string): Statement;
		export(): Uint8Array;
		close(): void;
		getRowsModified(): number;
	}
	export interface Statement {
		bind(params?: unknown[]): void;
		step(): boolean;
		getAsObject(params?: unknown[]): Record<string, unknown>;
		get(params?: unknown[]): unknown[];
		free(): boolean;
		reset(): void;
	}
	export interface QueryExecResult {
		columns: string[];
		values: unknown[][];
	}
	export default function initSqlJs(config?: Record<string, unknown>): Promise<{
		Database: new (data?: ArrayLike<number>) => Database;
	}>;
}
