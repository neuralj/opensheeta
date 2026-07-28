# Opensheeta Backend Analysis

## Architecture Overview

**Four-layer design**: Scheduler → Endpoint → Handler → Adapter

```
┌─────────────────────────────────────────────────────────────┐
│  Scheduler (Periodic Tasks)                                  │
│  ├─ HealthProbeScheduler (health checks)                     │
│  └─ AutomationScheduler (cron job scheduling)                │
├─────────────────────────────────────────────────────────────┤
│  Endpoint (Event Entry Points)                               │
│  ├─ REST API (Hono) - port 8765                             │
│  ├─ GUI WebSocket - port 8766                               │
│  ├─ OpenCode SSE (event subscription)                        │
│  └─ Inbox REST (inbox management)                            │
├─────────────────────────────────────────────────────────────┤
│  Handler (Business Logic)                                    │
│  ├─ SessionHandler (session management)                      │
│  ├─ ApprovalHandler (approval workflow)                      │
│  ├─ AutomationHandler (automation execution)                 │
│  ├─ EventBridgeHandler (event bridging)                      │
│  ├─ PersonaHandler (role configuration)                      │
│  └─ UnattendedHandler (unattended mode)                      │
├─────────────────────────────────────────────────────────────┤
│  Adapter (External Interfaces)                               │
│  ├─ OpenCodeAPIClient (real API)                             │
│  ├─ MockOpenCodeAPIClient (mock API)                         │
│  ├─ OpenCodeProcess (process management)                     │
│  ├─ InboxStore (SQLite inbox)                                │
│  ├─ ConversationStore (SQLite conversations)                 │
│  ├─ SecretStore (secret management)                          │
│  ├─ GUIBroadcast (WebSocket broadcast)                       │
│  ├─ ConnectorMCPServer (connector MCP)                       │
│  └─ MemoryMCPServer (memory MCP)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Functional Modules

### 1. Session Management
- Create/get/delete/list sessions
- Session metadata: title, workspace, model, mode, agent
- Session state: pin/unpin, archive/restore
- Message history storage

**API Endpoints**:
```
GET    /v1/sessions              # List all sessions
POST   /v1/sessions              # Create session
GET    /v1/sessions/:id          # Get session details
DELETE /v1/sessions/:id          # Delete session
POST   /v1/sessions/:id/messages # Send message
GET    /v1/sessions/:id/messages # Get message history
```

### 2. Real-time Communication
- **WebSocket Server** (port 8766): Frontend GUI connection
- **Event Broadcast**: Convert OpenCode SSE events to frontend events
- **Client Messages**: user_message, approval, interrupt, retry, set_mode, set_model
- **Server Events**: ready, turn_start, assistant_delta, assistant_message, tool_proposed, permission_required, turn_done, etc.

**Event Flow**:
```
OpenCode SSE → EventBridgeHandler → GUIBroadcast → WebSocket → Frontend
```

### 3. Approval System
- Tool execution requires user approval
- Approval decisions: once, always_tool, always_command, deny
- Approval requests pushed to frontend via WebSocket
- Supports unattended mode (auto-route to inbox)

**Workflow**:
```
permission.asked → ApprovalHandler → InboxStore → WebSocket push
                                           ↓
                                      User approval → API response → OpenCode
```

### 4. Inbox System
- Store pending approvals, questions, notifications
- Filter by session
- Support wait-for-resolution (long polling)
- SQLite persistent storage

**API Endpoints**:
```
GET  /v1/inbox              # List pending items
GET  /v1/inbox/:id          # Get single item
POST /v1/inbox/:id/resolve  # Resolve item
GET  /v1/inbox/:id/wait     # Wait for resolution (long polling)
```

### 5. Automation Scheduler
- Cron-based scheduled tasks
- Timezone support
- Task execution: create session → send instructions → record run results
- Support catch-up execution (missed tasks)
- Run history records

**Data Structure**:
```typescript
ScheduledTask {
  id, title, instructions, cron, timezone,
  workspace, agent, enabled,
  next_run, last_run
}
```

### 6. Event Bridge
Convert OpenCode SSE events to frontend-friendly event format:

| OpenCode Event | Frontend Event | Description |
|---|---|---|
| `session.status` (busy) | `turn_start` | Turn begins |
| `message.part.updated` (text) | `assistant_delta` | Streaming text delta |
| `message.part.updated` (reasoning) | `reasoning_delta` | Reasoning process delta |
| `message.part.updated` (tool-invocation) | `tool_proposed` | Tool call proposal |
| `permission.asked` | `permission_required` | Approval needed |
| `tool.execute.before` | `tool_started` | Tool execution starts |
| `tool.execute.after` | `tool_finished` | Tool execution completes |
| `session.idle` | `assistant_message` + `turn_done` | Turn ends |
| `session.error` | `error` | Error event |

### 7. Persona System
- Load persona definitions from Markdown files
- Persona attributes: name, system prompt, family, workspace type, permission mode
- Persona families: code, knowledge, deliverable
- Workspace types: git, project, deliverable, none
- Permission modes: interactive, auto, discuss

**Persona File Format**:
```markdown
---
id: cowork
name: Coworker
family: knowledge
workspace: deliverable
default_permission_mode: interactive
---

System prompt content...
```

### 8. MCP Servers
- **Connector MCP Server**: Connector tools (web_search, etc.)
- **Memory MCP Server**: Persistent memory storage
  - `remember`: Save memory
  - `memory_update`: Update memory
  - `memory_forget`: Delete memory

### 9. Storage System
- **ConversationStore**: Session metadata (SQLite)
  - Session ID, title, workspace, model, mode, agent
  - Message count, update time, pin/archive status
- **InboxStore**: Inbox items (SQLite)
  - Approvals, questions, notifications, directory requests, plans
  - State: pending/resolved
  - Resolution records
- **SecretStore**: Secret management (JSON file)
  - API keys, tokens
  - File permission 0600

### 10. Operating Modes
- **Full Mode**: Start OpenCode process, real API calls
- **Standalone Mode**: Use Mock API, no OpenCode required
- **Fallback**: Auto-degrade to Standalone when OpenCode fails to start

**Environment Variables**:
```bash
OS_STANDALONE=true  # Enable standalone mode
OS_PORT=8765        # REST API port
OS_HOST=0.0.0.0     # Listen address
```

---

## Current Status

| Feature | Status | Notes |
|---|---|---|
| REST API | ✅ Implemented | Sessions, messages, inbox, agents |
| WebSocket | ✅ Implemented | GUI connection, event broadcast |
| SSE Subscription | ✅ Implemented | OpenCode event stream |
| Session Management | ✅ Implemented | CRUD + message history |
| Approval System | ✅ Implemented | Tool execution approval |
| Inbox | ✅ Implemented | Pending item management |
| Automation Scheduler | ⚠️ Partial | Scheduler implemented, not started in daemon.ts |
| Persona System | ⚠️ Partial | Handler implemented, not loaded in daemon.ts |
| MCP Servers | ⚠️ Partial | Code implemented, not started in daemon.ts |
| Unattended Mode | ⚠️ Partial | Handler implemented, not exposed via API |

---

## Pending Work

1. **WebSocket Message Handling**: `daemon.ts:132-134` only logs, doesn't actually process messages
2. **Automation Scheduler Integration**: `AutomationScheduler` not started in daemon
3. **Persona Loading**: `PersonaHandler` not called in daemon
4. **MCP Server Startup**: Connector/Memory MCP servers not started
5. **Unattended API**: `UnattendedHandler` not exposed via REST endpoints
6. **OpenCode SSE Integration**: `OpenCodeSSEEndpoint` not started in daemon

---

## File Structure

```
src/
├── adapters/
│   ├── connector-mcp-server.ts    # Connector MCP server
│   ├── conversation-store.ts      # Conversation SQLite store
│   ├── gui-broadcast.ts           # WebSocket broadcast
│   ├── inbox-store.ts             # Inbox SQLite store
│   ├── memory-mcp-server.ts       # Memory MCP server
│   ├── mock-opencode-api.ts       # Mock OpenCode API client
│   ├── opencode-api.ts            # Real OpenCode API client
│   ├── opencode-process.ts        # OpenCode process manager
│   └── secret-store.ts            # Secret file store
├── config/
│   ├── defaults.ts                # Default configuration
│   └── index.ts                   # Config loader
├── endpoints/
│   ├── gui-websocket.ts           # WebSocket endpoint
│   ├── inbox-rest.ts              # Inbox REST endpoint
│   ├── opencode-sse.ts            # OpenCode SSE endpoint
│   └── rest-api.ts                # Main REST API
├── handlers/
│   ├── approval-handler.ts        # Approval workflow
│   ├── automation-handler.ts      # Automation execution
│   ├── event-bridge-handler.ts    # Event bridge
│   ├── persona-handler.ts         # Persona management
│   ├── session-handler.ts         # Session management
│   └── unattended-handler.ts      # Unattended mode
├── scheduler/
│   ├── automation-scheduler.ts    # Cron scheduler
│   └── health-probe.ts            # Health probe
├── shared/
│   ├── errors.ts                  # Custom errors
│   └── logger.ts                  # Logger
├── types/
│   ├── connector.ts               # Connector types
│   ├── externals.d.ts             # External declarations
│   ├── opencode.ts                # OpenCode types
│   ├── openworker.ts              # OpenWorker types
│   └── persona.ts                 # Persona types
└── daemon.ts                      # Main entry point
```
