import { createLogger } from "../src/shared/logger"
import { startMemoryMCPServer } from "../src/adapters/memory-mcp-server"

const logger = createLogger("info")
const dbPath = process.env.OW_MEMORY_DB ?? "memory.db"

startMemoryMCPServer({ dbPath, logger }).catch((err) => {
  console.error("Memory MCP server failed:", err)
  process.exit(1)
})
