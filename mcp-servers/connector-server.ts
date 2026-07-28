import { createLogger } from "../src/shared/logger"
import { createSecretStore } from "../src/adapters/secret-store"
import { startConnectorMCPServer } from "../src/adapters/connector-mcp-server"

const logger = createLogger("info")
const secretsPath = process.env.OW_SECRETS_PATH ?? "~/.config/coworker/secrets.json"
const secrets = createSecretStore(secretsPath, logger)

startConnectorMCPServer({ secrets, logger }).catch((err) => {
  console.error("Connector MCP server failed:", err)
  process.exit(1)
})
