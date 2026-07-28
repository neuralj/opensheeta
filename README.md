# opensheeta

Opensheeta — AI agent daemon.

## Architecture

Four-layer design: Scheduler + Endpoint → Handler → Adapter

- **Scheduler**: Periodic tasks (automation scheduling, health probing)
- **Endpoint**: Event reception (OpenCode SSE, GUI WebSocket, Inbox REST)
- **Handler**: Business orchestration (event bridging, approval flow, persona mapping)
- **Adapter**: External I/O (OpenCode process/API, SQLite stores, MCP servers, GUI broadcast)

## Quick Start

```bash
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OS_PORT` | 8765 | REST API port |
| `OS_HOST` | 127.0.0.1 | REST API host |
| `OS_STANDALONE` | false | Run without OpenCode (mock API) |
| `OS_LOG_LEVEL` | info | Log level (debug/info/warn/error) |
| `OS_STATE_DIR` | ~/.config/opensheeta | State directory |
| `OS_INBOX_DB` | inbox.db | Inbox database path |
| `OS_CONV_DB` | conversations.db | Conversations database path |
| `OS_SECRETS_PATH` | ~/.config/opensheeta/secrets.json | Secrets file path |
| `OC_PORT` | 4096 | OpenCode server port |
| `OC_HOST` | 127.0.0.1 | OpenCode server host |

## License

MIT
