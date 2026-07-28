# Architecture

## Four-Layer Design

openworker-next uses a Scheduler + Endpoint → Handler → Adapter architecture.

### Layers

- **Scheduler**: Periodic tasks (automation scheduling, health probing)
- **Endpoint**: Event reception (OpenCode SSE, GUI WebSocket, Inbox REST)
- **Handler**: Business orchestration (event bridging, approval flow, persona mapping)
- **Adapter**: External I/O (OpenCode process/API, SQLite stores, MCP servers, GUI broadcast)

### Data Flow

1. User sends message via GUI → gui-websocket endpoint
2. Endpoint dispatches to session-handler
3. Session-handler calls opencode-api adapter to create/send message
4. opencode-sse endpoint receives SSE events
5. event-bridge-handler converts OpenCode events → OpenWorker WS events
6. gui-broadcast adapter sends events to GUI

### Approval Flow

1. OpenCode emits permission.asked SSE event
2. opencode-sse endpoint receives it
3. approval-handler creates Inbox item, broadcasts to GUI
4. User responds via GUI WebSocket or Inbox REST
5. approval-handler resolves Inbox item
6. approval-handler calls opencode-api to respond to permission

### Automation Flow

1. automation-scheduler checks for due tasks periodically
2. automation-handler creates an OpenCode session with task instructions
3. OpenCode executes the task using available tools (connectors via MCP)
4. Results are recorded as TaskRun entries
