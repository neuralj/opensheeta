declare module "sql.js" {
  interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string): QueryExecutionResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    getRowsModified(): number
    close(): void
  }

  interface Statement {
    bind(params?: unknown[]): void
    step(): boolean
    getAsObject(): Record<string, unknown>
    get(params?: unknown[]): unknown[]
    free(): boolean
    reset(): void
  }

  interface QueryExecutionResult {
    columns: string[]
    values: unknown[][]
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database
  }

  export default function initSqlJs(config?: unknown): Promise<SqlJsStatic>
  export type { Database, Statement }
}

declare module "croner" {
  export class Cron {
    constructor(pattern: string, options?: { timezone?: string }, func?: () => void)
    stop(): void
  }
}
