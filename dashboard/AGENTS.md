# AGENTS.md

## Overview

`opensheeta-dashboard` — SvelteKit 5 AI oversight dashboard for the opensheeta daemon. Visualizes repo state (git info, architecture layer analysis, CI status) and lets you browse the analyzed codebase. Parent repo root is found at runtime via `src/lib/server/repo.ts` (looks for `package.json` + `src/daemon.ts`).

## Commands

```bash
npm run dev      # Vite dev server on :3099
npm run build    # Adapter-node build → build/
npm run start    # Node server from build/ (production)
npm run preview  # Vite preview
npm run check    # svelte-kit sync + svelte-check (type checking)
```

## Stack

- Svelte 5 (runes mode, `compilerOptions.runes: true`) + SvelteKit 2, adapter-node
- Tailwind CSS 4 (`@tailwindcss/vite`)
- shiki (syntax highlighting), marked (markdown), mermaid (architecture diagrams), d3-selection/zoom (file tree pan/zoom)
- TypeScript strict, `$lib` alias → `src/lib`

## Structure

- `src/routes/` — Pages: `+page.svelte` (dashboard), `architecture/`, `browse/` (file tree + code viewer)
- `src/routes/api/` — Server endpoints:
  - `GET /api/state?refresh=1` — repo state (git, architecture summary, CI status), 60s cached
  - `GET /api/architecture` — full layer/import analysis
  - `GET /api/files?path=&action=list|content` — file browsing (path-traversal protected)
- `src/lib/server/` — `state.ts` (cached repo state), `repo.ts` (repo root discovery), `architecture.ts` (layer analysis), `ci.ts` (GitHub CI status via git branch/gh)
- `src/lib/` — `types.ts` (shared types), `architecture-constants.ts` (layer colors/allowed deps/order)
- `src/lib/components/` — `Sidebar.svelte`, `FileTree.svelte`, `CodeViewer.svelte`, `MarkdownView.svelte`

## Conventions

- Server logic uses `execSync` git commands with fallbacks to `unknown`/empty values (never crash the dashboard)
- Architecture analysis classifies files into layers: `scheduler` | `endpoint` | `handler` | `adapter` | `config` | `types` | `shared` | `other`
- Results cached ~60s TTL; `?refresh=1` forces re-analysis
- File API enforces path stays within repo root (403 otherwise)
- No tests configured for this subproject

## Gotchas

- `.svelte-kit/` and `build/` are generated — don't hand-edit
- Vite dev port is 3099 (matches Caddy reverse proxy config in repo root)
- `npm run check` is the typecheck equivalent (no lint script)
