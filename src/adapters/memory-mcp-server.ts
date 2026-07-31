import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import initSqlJs, { type Database } from "sql.js"
import type { Logger } from "@/shared/logger"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { dirname } from "path"

export interface MemoryMCPOptions {
  dbPath: string
  logger: Logger
}

export async function startMemoryMCPServer(opts: MemoryMCPOptions): Promise<void> {
  const { dbPath, logger } = opts
  const log = logger.child({ component: "memory-mcp" })
  mkdirSync(dirname(dbPath), { recursive: true })

  const SQL = await initSqlJs()
  let db: Database
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL DEFAULT 'workspace',
      content TEXT NOT NULL,
      workspace TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  persist()

  function persist(): void {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }

  const server = new Server(
    { name: "opensheeta-memory", version: "1.0.0" },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "remember",
        description: "Save a durable memory (a fact or preference) to recall in future sessions.",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The thing to remember" },
            scope: { type: "string", enum: ["workspace", "global"], description: "Scope" },
          },
          required: ["content"],
        },
      },
      {
        name: "memory_update",
        description: "Rewrite an existing memory with corrected content.",
        inputSchema: {
          type: "object",
          properties: {
            memory_id: { type: "integer", description: "The memory's id" },
            content: { type: "string", description: "The corrected memory text" },
          },
          required: ["memory_id", "content"],
        },
      },
      {
        name: "memory_forget",
        description: "Delete a memory that is no longer true.",
        inputSchema: {
          type: "object",
          properties: {
            memory_id: { type: "integer", description: "The memory's id" },
          },
          required: ["memory_id"],
        },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name
    const args = request.params.arguments as Record<string, unknown>

    switch (name) {
      case "remember": {
        db.run("INSERT INTO memories (content, scope, workspace) VALUES (?, ?, ?)", [
          args.content as string,
          (args.scope as string) ?? "workspace",
          null,
        ])
        persist()
        const stmt = db.prepare("SELECT last_insert_rowid() as id")
        stmt.step()
        const row = stmt.getAsObject()
        stmt.free()
        return { content: [{ type: "text", text: JSON.stringify({ id: row.id, scope: args.scope ?? "workspace", saved: true }) }] }
      }
      case "memory_update": {
        db.run("UPDATE memories SET content = ? WHERE id = ?", [args.content as string, args.memory_id as number])
        persist()
        const changes = db.getRowsModified()
        return { content: [{ type: "text", text: JSON.stringify({ updated: changes > 0, id: args.memory_id }) }] }
      }
      case "memory_forget": {
        db.run("DELETE FROM memories WHERE id = ?", [args.memory_id as number])
        persist()
        const changes = db.getRowsModified()
        return { content: [{ type: "text", text: JSON.stringify({ deleted: changes > 0, id: args.memory_id }) }] }
      }
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  log.info("Memory MCP server started")
}
