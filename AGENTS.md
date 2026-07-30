# AGENTS.md

## Commands

```bash
npm run dev          # Start daemon + frontend (concurrently)
npm run dev:backend  # Start daemon with tsx watch only
npm run dev:frontend # Start Vue frontend (Vite HMR on :5173)
npm run build        # Build frontend + backend (tsup, ESM, Node 22)
npm test             # Run vitest
npm run typecheck    # tsc --noEmit
npm run mcp:connectors  # Run connector MCP server
npm run mcp:memory      # Run memory MCP server
```

No lint script configured.

## Architecture

Four-layer design: **Scheduler + Endpoint → Handler → Adapter**

- `src/scheduler/` — Task queue, cooldown, pipeline, recurring cron, health probe
- `src/endpoints/` — Event reception (REST, WebSocket, SSE)
- `src/handlers/` — Business orchestration (session, approval, event bridge, persona, unattended)
- `src/adapters/` — External I/O (OpenCode API, SQLite stores, MCP, GUI broadcast)

Entry point: `src/daemon.ts`

### Scheduler components

- `queue-processor.ts` — Single-running task queue with 1s poll loop
- `cooldown-manager.ts` — Rate-limit detection + probe self-healing (ping interval default 14min)
- `pipeline-runner.ts` — Sequential multi-stage orchestration (shares OpenCode session across stages)
- `recurring-scheduler.ts` — 5-field cron parser + 60s tick scheduler
- `event-bus.ts` — Internal EventEmitter (task/status events → WebSocket broadcast)

### Key data flow

1. Task submitted via REST → `taskStore.enqueue()` → `QueueProcessor` picks up → creates OpenCode session → sends message
2. If rate-limited (aborted) → `CooldownManager` pauses queue → probes with ping → recovers
3. SSE events from OpenCode → `EventBridgeHandler` translates to WebSocket events → GUI
4. `permission.asked` SSE → `ApprovalHandler` → inbox queue → blocks until user resolves or timeout
5. Pipeline stages advance via EventBus task completion events
6. Task chain: on completion/failure → `triggerChain()` enqueues next task if `on_success`/`on_failure` prompt exists and `chain_depth < max_chain_depth`

### Frontend

Vue 3 + Element Plus SPA in `frontend/`. Routes: Dashboard, Tasks, TaskDetail, Pipelines, Recurring, Queue.
Production build copies `frontend/dist` → `dist/public`, served by Hono `serveStatic`.

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Environment

- `OS_STANDALONE=true` — Run without OpenCode (uses mock API)
- `OS_PORT` / `OS_HOST` — REST API (default 8765 / 0.0.0.0)
- `OC_PORT` / `OC_HOST` — OpenCode server (default 4096 / 127.0.0.1)
- `OS_COOLDOWN_PING_INTERVAL` — Cooldown probe interval in ms (default 840000 = 14min)
- WebSocket runs on REST port + 1

## Testing

- Unit tests: `tests/*.test.ts` (vitest)
- Integration: `tests/integration/container-test.sh` (requires Docker)
- No vitest config file — uses defaults

## Storage

SQLite via sql.js (WASM, file-persisted after every write):
- `tasks.db` — Task queue, pipelines, pipeline stages, recurring tasks
- `inbox.db` — Inbox items (approval flow)
- `conversations.db` — Conversation history

## Key Conventions

- ESM modules (`"type": "module"`)
- Target Node 22
- Hono for REST, ws for WebSocket
- Config loaded in `src/config/`, defaults in `src/config/defaults.ts`
- Factory functions (not classes) for adapter/scheduler/handler creation
- `EventBus` bridges internal task events to WebSocket GUI updates
- Cooldown/queue circular dependency resolved via `queue.setCooldown()` late injection


