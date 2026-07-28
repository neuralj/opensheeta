import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import type { Logger } from "@/shared/logger"
import type { SecretStore } from "@/adapters/secret-store"

export interface ConnectorMCPServerOptions {
  secrets: SecretStore
  logger: Logger
}

export async function startConnectorMCPServer(opts: ConnectorMCPServerOptions): Promise<void> {
  const { secrets, logger } = opts
  const log = logger.child({ component: "connector-mcp" })

  const server = new Server(
    { name: "opensheeta-connectors", version: "1.0.0" },
    { capabilities: { tools: {} } },
  )

  const toolRegistry = new Map<string, {
    schema: Record<string, unknown>
    execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
  }>()

  await loadConnectorTools(secrets, toolRegistry, log)

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = []
    for (const [name, entry] of toolRegistry) {
      tools.push({
        name,
        description: (entry.schema as Record<string, unknown>).description as string ?? "",
        inputSchema: (entry.schema as Record<string, unknown>).parameters as Record<string, unknown> ?? { type: "object", properties: {} },
      })
    }
    return { tools }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name
    const args = request.params.arguments as Record<string, unknown>
    const entry = toolRegistry.get(name)
    if (!entry) {
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true }
    }

    try {
      const result = await entry.execute(args ?? {})
      const isError = "error" in result
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError,
      }
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${String(err)}` }],
        isError: true,
      }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  log.info("Connector MCP server started")
}

async function loadConnectorTools(
  secrets: SecretStore,
  registry: Map<string, { schema: Record<string, unknown>; execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }>,
  logger: Logger,
): Promise<void> {
  registry.set("web_search", {
    schema: {
      description: "Search the web",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
        required: ["query"],
      },
    },
    execute: async (args) => {
      return { results: [], query: args.query }
    },
  })

  const status = secrets.status()
  for (const { profile } of status) {
    const connectorName = profile.split(":")[0]
    logger.info("Connector profile found", { connector: connectorName, profile })
  }
}
