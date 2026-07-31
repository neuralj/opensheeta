# opensheeta

Opensheeta — AI agent daemon with Living Repository Dashboard.

## Features

### Core System
- **Four-layer architecture**: Scheduler + Endpoint → Handler → Adapter
- **Task management**: Queue processing, pipelines, recurring tasks, task chains
- **Real-time communication**: WebSocket events, SSE integration
- **Approval workflow**: Human-in-the-loop permission system
- **Memory system**: Persistent decision tracking and knowledge base
- **Multi-agent support**: Multiple personas (coder, researcher, planner, coworker)

### Living Repository Dashboard
- **Overview**: Repository state, health metrics, recent decisions
- **Architecture**: Module dependency graph, coupling analysis, hot modules
- **Memory**: Decision records with categories (business, technical, architecture, security, performance, incident, lesson)
- **Timeline**: Execution history with task and commit tracking
- **Health**: Code quality metrics (type safety, tests, build, complexity, dependencies, documentation)
- **Services**: Service status monitoring and management

### Service Management
- **launchd integration**: Native macOS service management
- **CLI tools**: Start, stop, restart, status, logs
- **Production deployment**: systemd service files included

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    opensheeta daemon                         │
├─────────────────────────────────────────────────────────────┤
│  Scheduler Layer                                            │
│  ├─ Queue Processor (task execution)                        │
│  ├─ Pipeline Runner (multi-stage tasks)                     │
│  ├─ Recurring Scheduler (cron tasks)                        │
│  ├─ Cooldown Manager (rate limiting)                        │
│  └─ Health Probe (system monitoring)                        │
├─────────────────────────────────────────────────────────────┤
│  Endpoint Layer                                             │
│  ├─ REST API (Hono server)                                  │
│  ├─ WebSocket (real-time events)                            │
│  ├─ SSE (OpenCode events)                                   │
│  └─ Inbox REST (approval management)                        │
├─────────────────────────────────────────────────────────────┤
│  Handler Layer                                              │
│  ├─ Session Handler (conversation management)               │
│  ├─ Approval Handler (permission workflow)                  │
│  ├─ Event Bridge (SSE → WebSocket)                          │
│  ├─ Persona Handler (agent configuration)                   │
│  └─ Automation Handler (scheduled tasks)                    │
├─────────────────────────────────────────────────────────────┤
│  Adapter Layer                                              │
│  ├─ OpenCode API (agent communication)                      │
│  ├─ SQLite Stores (tasks, inbox, conversations, memory)     │
│  ├─ MCP Servers (connector, memory)                         │
│  └─ GUI Broadcast (WebSocket distribution)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Living Repository Dashboard                     │
│  ├─ Overview (state, health, decisions)                     │
│  ├─ Architecture (dependency graph, metrics)                │
│  ├─ Memory (decision records, search)                       │
│  ├─ Timeline (execution history)                            │
│  ├─ Health (code quality metrics)                           │
│  └─ Services (service monitoring)                           │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Development Mode

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..
cd dashboard && npm install && cd ..

# Start daemon + frontend
npm run dev

# Or start separately
npm run dev:backend    # Daemon on port 8765
npm run dev:frontend   # Frontend on port 5173
npm run dev:dashboard  # Dashboard on port 3000
```

### Production Mode

```bash
# Build all components
npm run build

# Start daemon
npm start

# Or use service management
scripts/services start opensheeta
scripts/services start opensheeta-dash
```

## Service Management

```bash
# Check status
scripts/services status

# Start services
scripts/services start opensheeta      # Daemon
scripts/services start opensheeta-dash # Dashboard

# Stop services
scripts/services stop opensheeta

# Restart services
scripts/services restart opensheeta

# View logs
scripts/services logs opensheeta
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OS_PORT` | 8765 | REST API port |
| `OS_HOST` | 127.0.0.1 | REST API host |
| `OS_STANDALONE` | false | Run without OpenCode (mock API) |
| `OS_LOG_LEVEL` | info | Log level (debug/info/warn/error) |
| `OS_STATE_DIR` | ~/.config/opensheeta | State directory |
| `OS_INBOX_DB` | data/inbox.db | Inbox database path |
| `OS_CONV_DB` | data/conversations.db | Conversations database path |
| `OS_TASKS_DB` | data/tasks.db | Tasks database path |
| `OW_MEMORY_DB` | data/memory.db | Memory database path |
| `OS_SECRETS_PATH` | ~/.config/opensheeta/secrets.json | Secrets file path |
| `OC_PORT` | 4096 | OpenCode server port |
| `OC_HOST` | 127.0.0.1 | OpenCode server host |

## API Endpoints

### Core API (port 8765)

- `GET /health` - Health check
- `POST /v1/tasks` - Create task
- `GET /v1/tasks` - List tasks
- `POST /v1/pipelines` - Create pipeline
- `POST /v1/recurring` - Create recurring task
- `GET /v1/inbox` - List inbox items
- `POST /v1/inbox/:id/resolve` - Resolve inbox item
- `GET /v1/personas` - List personas
- `GET /v1/automations` - List automations

### Dashboard API (port 3000)

- `GET /api/state` - Repository state
- `GET /api/architecture` - Architecture analysis
- `GET /api/health` - Health metrics
- `GET /api/memory` - List decisions
- `POST /api/memory` - Create decision
- `GET /api/timeline` - Execution timeline
- `GET /api/services` - Service status
- `GET /api/context` - Agent context snapshot

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck
cd frontend && npm run check
cd dashboard && npm run check
```

## Project Structure

```
opensheeta/
├── src/                    # Backend daemon
│   ├── adapters/          # External integrations
│   ├── config/            # Configuration
│   ├── endpoints/         # API endpoints
│   ├── handlers/          # Business logic
│   ├── scheduler/         # Task scheduling
│   ├── shared/            # Shared utilities
│   └── types/             # TypeScript types
├── frontend/              # Vue 3 frontend
│   └── src/
│       ├── components/    # UI components
│       ├── composables/   # Vue composables
│       ├── router/        # Vue Router
│       ├── stores/        # Pinia stores
│       └── views/         # Page views
├── dashboard/             # SvelteKit dashboard
│   └── src/
│       ├── lib/
│       │   ├── components/  # UI components
│       │   └── server/      # Analysis engines
│       └── routes/
│           ├── api/         # API endpoints
│           └── [pages]/     # Dashboard pages
├── personas/              # Agent personas
├── scripts/               # Service management
├── deploy/                # Deployment configs
└── tests/                 # Test suites
```

## Personas

- **coder**: Expert software engineer, writes clean and efficient code
- **researcher**: Thorough research assistant, analyzes information
- **planner**: Project planning specialist, breaks down tasks
- **coworker**: General-purpose AI coworker

## Documentation

- [Architecture Guide](docs/architecture.md)
- [Backend Analysis](docs/backend-analysis.md)
- [Event Mapping](docs/event-mapping.md)
- [Task Plan](.opencode/plans/TASK_PLAN.md)
- [Progress](.opencode/plans/PROGRESS.md)

## License

MIT
