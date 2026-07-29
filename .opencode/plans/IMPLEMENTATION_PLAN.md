# opensheeta 实施计划

> AI Agent Daemon + Vue Web UI 完整实施方案

## 目录

- [概述](#概述)
- [Phase 1: Task Chain 自动迭代](#phase-1-task-chain-自动迭代)
- [Phase 2: Vue 前端项目初始化](#phase-2-vue-前端项目初始化)
- [Phase 3: 前端核心层](#phase-3-前端核心层)
- [Phase 4: 前端页面实现](#phase-4-前端页面实现)
- [Phase 5: 后端静态文件服务](#phase-5-后端静态文件服务)
- [Phase 6: 构建与集成](#phase-6-构建与集成)

---

## 概述

### 当前状态

| 模块 | 状态 | 说明 |
|------|------|------|
| Task Queue | ✅ 完成 | 单任务运行，1s 轮询 |
| Cooldown Manager | ✅ 完成 | Rate limit 检测 + ping 探活自愈 |
| Pipeline Runner | ✅ 完成 | 多阶段顺序编排 |
| Recurring Scheduler | ✅ 完成 | 5 字段 cron + 60s tick |
| EventBus | ✅ 完成 | 内部事件 → WebSocket 广播 |
| REST API | ✅ 完成 | 28 个路由 |
| WebSocket | ✅ 完成 | 实时事件推送 |
| SQLite 存储 | ✅ 完成 | tasks/inbox/conversations |
| SSE → EventBridge | ✅ 完成 | OpenCode 事件翻译 |
| 审批流 | ✅ 完成 | human-in-the-loop |

### 待实现

| 模块 | 优先级 | 说明 |
|------|--------|------|
| Task Chain | P0 | 任务完成后自动触发后续任务 |
| Vue Web UI | P0 | Element Plus 精致设计 |
| 静态文件服务 | P1 | Hono serveStatic |
| 局域网访问 | P1 | host 默认 0.0.0.0 |

---

## Phase 1: Task Chain 自动迭代

### 1.1 数据模型扩展

**文件**: `src/types/task.ts`

```typescript
export interface TaskRecord {
  id: string
  directory: string
  prompt: string
  model: string
  status: TaskStatus
  agent_id?: string
  attempts: number
  max_attempts: number
  created_at: number
  updated_at: number
  error?: string
  pipeline_id?: string
  // 新增字段
  on_success?: string      // 成功后自动执行的 prompt
  on_failure?: string      // 失败后自动执行的 prompt
  chain_depth?: number     // 当前链深度（默认 0）
  max_chain_depth?: number // 最大链深度（默认 10）
  parent_task_id?: string  // 触发当前任务的上游任务 ID
}
```

### 1.2 数据库迁移

**文件**: `src/adapters/task-store.ts`

在 `createTaskStore()` 中添加迁移逻辑：

```typescript
// 检查是否需要迁移
const stmt = db.prepare("PRAGMA table_info(tasks)")
const columns = new Set<string>()
while (stmt.step()) {
  const row = stmt.getAsObject() as Record<string, unknown>
  columns.add(row.name as string)
}
stmt.free()

// 添加新列
if (!columns.has("on_success")) {
  db.run("ALTER TABLE tasks ADD COLUMN on_success TEXT")
}
if (!columns.has("on_failure")) {
  db.run("ALTER TABLE tasks ADD COLUMN on_failure TEXT")
}
if (!columns.has("chain_depth")) {
  db.run("ALTER TABLE tasks ADD COLUMN chain_depth INTEGER DEFAULT 0")
}
if (!columns.has("max_chain_depth")) {
  db.run("ALTER TABLE tasks ADD COLUMN max_chain_depth INTEGER DEFAULT 10")
}
if (!columns.has("parent_task_id")) {
  db.run("ALTER TABLE tasks ADD COLUMN parent_task_id TEXT")
}
persist()
```

更新 `rowToTask()` 函数映射新字段。

### 1.3 QueueProcessor 链式触发

**文件**: `src/scheduler/queue-processor.ts`

在 `processOne()` 的 completed/failed 分支后添加链式逻辑：

```typescript
async function processOne(): Promise<boolean> {
  // ... 现有逻辑 ...

  if (aborted) {
    await store.markFailed(task.id, "rate limited")
    cooldown?.add(agentId)
    events.emitStatus({ cooldowns: cooldown?.getCooldowns() ?? [] })
    // 新增：触发 on_failure 链
    await triggerChain(task, "failure")
  } else {
    await store.markCompleted(task.id)
    events.emitTask({ id: task.id, status: "completed" })
    // 新增：触发 on_success 链
    await triggerChain(task, "success")
  }

  // ... catch 分支也触发 on_failure ...
}

async function triggerChain(task: TaskRecord, outcome: "success" | "failure"): Promise<void> {
  const chainPrompt = outcome === "success" ? task.on_success : task.on_failure
  if (!chainPrompt) return

  const depth = task.chain_depth ?? 0
  const maxDepth = task.max_chain_depth ?? 10
  if (depth >= maxDepth) {
    log.warn("Chain depth exceeded, skipping", { taskId: task.id, depth, maxDepth })
    return
  }

  const newTask: TaskRecord = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    directory: task.directory,
    prompt: chainPrompt,
    model: task.model,
    status: "pending",
    attempts: 0,
    max_attempts: task.max_attempts,
    created_at: Date.now(),
    updated_at: Date.now(),
    chain_depth: depth + 1,
    max_chain_depth: maxDepth,
    parent_task_id: task.id,
    on_success: task.on_success,  // 继承链配置
    on_failure: task.on_failure,
  }

  await store.enqueue(newTask)
  events.emitTask({ id: newTask.id, status: "pending" })
  log.info("Chain task enqueued", { parentId: task.id, taskId: newTask.id, outcome, depth: depth + 1 })
}
```

### 1.4 REST API 扩展

**文件**: `src/endpoints/rest-api.ts`

更新 `POST /v1/tasks` 接受新字段：

```typescript
app.post("/v1/tasks", async (c) => {
  if (!taskStore) return c.json({ error: "Task queue not available" }, 503)
  const body = await c.req.json() as {
    prompt: string
    directory?: string
    model?: string
    on_success?: string
    on_failure?: string
    max_chain_depth?: number
  }
  const task: TaskRecord = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    directory: body.directory ?? "",
    prompt: body.prompt,
    model: body.model ?? "",
    status: "pending",
    attempts: 0,
    max_attempts: 5,
    created_at: Date.now(),
    updated_at: Date.now(),
    on_success: body.on_success,
    on_failure: body.on_failure,
    chain_depth: 0,
    max_chain_depth: body.max_chain_depth ?? 10,
  }
  await taskStore.enqueue(task)
  events?.emitTask({ id: task.id, status: "pending" })
  return c.json(task, 201)
})
```

新增 `GET /v1/tasks/:id/chain` 查看任务链关系：

```typescript
app.get("/v1/tasks/:id/chain", async (c) => {
  if (!taskStore) return c.json({ error: "Task store not available" }, 503)
  const taskId = c.req.param("id")
  const task = await taskStore.getTask(taskId)
  if (!task) return c.json({ error: "Not found" }, 404)

  // 查找父任务
  let parent: TaskRecord | null = null
  if (task.parent_task_id) {
    parent = await taskStore.getTask(task.parent_task_id)
  }

  // 查找子任务（当前任务触发的后续任务）
  const allTasks = await taskStore.listTasks()
  const children = allTasks.filter(t => t.parent_task_id === taskId)

  return c.json({ task, parent, children })
})
```

新增 `PUT /v1/recurring/:id` 更新定时任务：

```typescript
app.put("/v1/recurring/:id", async (c) => {
  if (!recurring) return c.json({ error: "Recurring scheduler not available" }, 503)
  const id = c.req.param("id")
  const body = await c.req.json() as {
    name?: string
    prompt?: string
    cron?: string
    enabled?: boolean
  }
  const existing = await taskStore!.getRecurring(id)
  if (!existing) return c.json({ error: "Not found" }, 404)

  await taskStore!.updateRecurring(id, {
    name: body.name ?? existing.name,
    prompt: body.prompt ?? existing.prompt,
    cron: body.cron ?? existing.cron,
    enabled: body.enabled ?? existing.enabled,
  })
  const updated = await taskStore!.getRecurring(id)
  return c.json(updated)
})
```

### 1.5 验证

```bash
npm run typecheck
npm test

# Smoke test
OS_STANDALONE=true npm run dev &
sleep 2

# 创建链式任务
curl -X POST http://127.0.0.1:8765/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Step 1: Initial task",
    "on_success": "Step 2: Success follow-up",
    "on_failure": "Step 2: Failure recovery",
    "max_chain_depth": 3
  }'

# 查看任务链
curl http://127.0.0.1:8765/v1/tasks/<task_id>/chain

# 清理
kill %1
rm -f tasks.db
```

---

## Phase 2: Vue 前端项目初始化

### 2.1 创建项目结构

```bash
mkdir -p frontend/src/{composables,stores,views,components,router}
mkdir -p frontend/public
```

**文件**: `frontend/package.json`

```json
{
  "name": "opensheeta-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.6.0",
    "@element-plus/icons-vue": "^2.3.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vue-tsc": "^2.0.0"
  }
}
```

**文件**: `frontend/vite.config.ts`

```typescript
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      "/v1": "http://127.0.0.1:8765",
      "/health": "http://127.0.0.1:8765",
    },
  },
  build: {
    outDir: "dist",
  },
})
```

**文件**: `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**文件**: `frontend/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**文件**: `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>opensheeta</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**文件**: `frontend/src/main.ts`

```typescript
import { createApp } from "vue"
import { createPinia } from "pinia"
import ElementPlus from "element-plus"
import "element-plus/dist/index.css"
import * as ElementPlusIconsVue from "@element-plus/icons-vue"

import App from "./App.vue"
import router from "./router"

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount("#app")
```

**文件**: `frontend/src/env.d.ts`

```typescript
/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

**文件**: `frontend/src/App.vue`

```vue
<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-brand">
        <el-icon :size="24"><Monitor /></el-icon>
        <span class="brand-name">opensheeta</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        router
        class="header-menu"
      >
        <el-menu-item index="/">Dashboard</el-menu-item>
        <el-menu-item index="/tasks">Tasks</el-menu-item>
        <el-menu-item index="/pipelines">Pipelines</el-menu-item>
        <el-menu-item index="/recurring">Recurring</el-menu-item>
        <el-menu-item index="/queue">Queue</el-menu-item>
      </el-menu>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style>
:root {
  --brand-primary: #409eff;
  --brand-success: #67c23a;
  --brand-warning: #e6a23c;
  --brand-danger: #f56c6c;
  --bg-page: #f5f7fa;
  --bg-card: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--bg-page);
}

.app-container {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px !important;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--brand-primary);
}

.brand-name {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.header-menu {
  border-bottom: none !important;
}

.header-menu .el-menu-item {
  border-radius: 8px;
  margin: 0 4px;
}

.header-menu .el-menu-item.is-active {
  background: var(--brand-primary);
  color: white !important;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}
</style>
```

**文件**: `frontend/src/router/index.ts`

```typescript
import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Dashboard",
      component: () => import("../views/Dashboard.vue"),
    },
    {
      path: "/tasks",
      name: "Tasks",
      component: () => import("../views/Tasks.vue"),
    },
    {
      path: "/tasks/:id",
      name: "TaskDetail",
      component: () => import("../views/TaskDetail.vue"),
    },
    {
      path: "/pipelines",
      name: "Pipelines",
      component: () => import("../views/Pipelines.vue"),
    },
    {
      path: "/recurring",
      name: "Recurring",
      component: () => import("../views/Recurring.vue"),
    },
    {
      path: "/queue",
      name: "Queue",
      component: () => import("../views/Queue.vue"),
    },
  ],
})

export default router
```

### 2.2 安装依赖

```bash
cd frontend
npm install
```

---

## Phase 3: 前端核心层

### 3.1 API 封装

**文件**: `frontend/src/composables/useAPI.ts`

```typescript
import axios from "axios"
import type { TaskRecord, PipelineRecord, PipelineStage, RecurringRecord } from "../types"

const api = axios.create({
  baseURL: "",
  timeout: 30000,
})

export interface TaskChainInfo {
  task: TaskRecord
  parent: TaskRecord | null
  children: TaskRecord[]
}

export const useAPI = () => {
  return {
    // Health
    getHealth: () => api.get<{ status: string; mode: string }>("/health"),

    // Tasks
    getTasks: (status?: string) =>
      api.get<{ tasks: TaskRecord[] }>("/v1/tasks", { params: { status } }),
    getTask: (id: string) => api.get<TaskRecord>(`/v1/tasks/${id}`),
    createTask: (data: {
      prompt: string
      directory?: string
      model?: string
      on_success?: string
      on_failure?: string
      max_chain_depth?: number
    }) => api.post<TaskRecord>("/v1/tasks", data),
    abortTask: (id: string) => api.post(`/v1/tasks/${id}/abort`),
    retryTask: (id: string) => api.post(`/v1/tasks/${id}/retry`),
    getTaskChain: (id: string) => api.get<TaskChainInfo>(`/v1/tasks/${id}/chain`),

    // Queue
    controlQueue: (action: "pause" | "resume") =>
      api.post<{ paused: boolean }>("/v1/queue", { action }),

    // Pipelines
    getPipelines: () =>
      api.get<{ pipelines: (PipelineRecord & { stages: PipelineStage[] })[] }>("/v1/pipelines"),
    getPipeline: (id: string) =>
      api.get<PipelineRecord & { stages: PipelineStage[] }>(`/v1/pipelines/${id}`),
    createPipeline: (data: {
      name?: string
      directory?: string
      stages: { prompt: string; model?: string; label?: string }[]
    }) => api.post<PipelineRecord>("/v1/pipelines", data),
    abortPipeline: (id: string) => api.post(`/v1/pipelines/${id}/abort`),
    deletePipeline: (id: string) => api.delete(`/v1/pipelines/${id}`),

    // Recurring
    getRecurring: () => api.get<{ recurring: RecurringRecord[] }>("/v1/recurring"),
    createRecurring: (data: {
      name: string
      directory?: string
      prompt: string
      cron: string
      model?: string
      timezone?: string
      enabled?: boolean
    }) => api.post<RecurringRecord>("/v1/recurring", data),
    updateRecurring: (id: string, data: Partial<RecurringRecord>) =>
      api.put<RecurringRecord>(`/v1/recurring/${id}`, data),
    deleteRecurring: (id: string) => api.delete(`/v1/recurring/${id}`),

    // Agents
    getAgents: () => api.get<{ agents: any[] }>("/v1/agents"),
  }
}
```

### 3.2 TypeScript 类型定义

**文件**: `frontend/src/types/index.ts`

```typescript
export type TaskStatus = "pending" | "running" | "completed" | "failed"

export interface TaskRecord {
  id: string
  directory: string
  prompt: string
  model: string
  status: TaskStatus
  agent_id?: string
  attempts: number
  max_attempts: number
  created_at: number
  updated_at: number
  error?: string
  pipeline_id?: string
  on_success?: string
  on_failure?: string
  chain_depth?: number
  max_chain_depth?: number
  parent_task_id?: string
}

export type PipelineStatus = "pending" | "running" | "completed" | "failed"
export type StageStatus = "pending" | "running" | "completed" | "failed" | "skipped"

export interface PipelineStage {
  id: string
  pipeline_id: string
  stage_index: number
  label: string
  prompt: string
  model?: string
  status: StageStatus
  task_id?: string
  error?: string
}

export interface PipelineRecord {
  id: string
  name: string
  directory: string
  status: PipelineStatus
  current_stage: number
  session_id?: string
  created_at: number
  updated_at: number
}

export interface RecurringRecord {
  id: string
  name: string
  directory: string
  prompt: string
  model: string
  cron: string
  timezone?: string
  enabled: boolean
  last_run_at?: number
}

export interface QueueStatus {
  pending: number
  paused: boolean
  cooldowns: string[]
}
```

### 3.3 WebSocket 连接

**文件**: `frontend/src/composables/useWebSocket.ts`

```typescript
import { ref, onMounted, onUnmounted } from "vue"
import { useTasksStore } from "../stores/tasks"
import { useQueueStore } from "../stores/queue"
import { usePipelinesStore } from "../stores/pipelines"

export interface TaskUpdateEvent {
  id: string
  status: string
  error?: string
  pipeline_id?: string
  stage?: number
}

export interface QueueStatusEvent {
  pending: number
  paused: boolean
  cooldowns: string[]
}

export interface PipelineUpdateEvent {
  id: string
  status: string
  stage?: number
  total?: number
}

export const useWebSocket = () => {
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const tasksStore = useTasksStore()
  const queueStore = useQueueStore()
  const pipelinesStore = usePipelinesStore()

  const connect = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsPort = parseInt(window.location.port || "8765") + 1
    const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/?session_id=dashboard`

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      connected.value = true
      console.log("WebSocket connected")
    }

    ws.onclose = () => {
      connected.value = false
      console.log("WebSocket disconnected, reconnecting in 3s...")
      reconnectTimer = setTimeout(connect, 3000)
    }

    ws.onerror = (err) => {
      console.error("WebSocket error:", err)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err)
      }
    }
  }

  const handleMessage = (msg: any) => {
    switch (msg.type) {
      case "task_update":
        tasksStore.handleTaskUpdate(msg.data as TaskUpdateEvent)
        break
      case "queue_status":
        queueStore.handleQueueStatus(msg.data as QueueStatusEvent)
        break
      case "pipeline_update":
        pipelinesStore.handlePipelineUpdate(msg.data as PipelineUpdateEvent)
        break
      case "ready":
        console.log("WebSocket ready:", msg.data)
        break
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    if (ws) {
      ws.close()
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
  })

  return {
    connected,
  }
}
```

### 3.4 Pinia Stores

**文件**: `frontend/src/stores/tasks.ts`

```typescript
import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { TaskRecord, TaskStatus } from "../types"
import { useAPI } from "../composables/useAPI"
import type { TaskUpdateEvent } from "../composables/useWebSocket"

export const useTasksStore = defineStore("tasks", () => {
  const tasks = ref<TaskRecord[]>([])
  const loading = ref(false)
  const filter = ref<TaskStatus | "">("")

  const api = useAPI()

  const filteredTasks = computed(() => {
    if (!filter.value) return tasks.value
    return tasks.value.filter((t) => t.status === filter.value)
  })

  const fetchTasks = async (status?: string) => {
    loading.value = true
    try {
      const res = await api.getTasks(status)
      tasks.value = res.data.tasks
    } finally {
      loading.value = false
    }
  }

  const createTask = async (data: Parameters<typeof api.createTask>[0]) => {
    const res = await api.createTask(data)
    tasks.value.unshift(res.data)
    return res.data
  }

  const handleTaskUpdate = (event: TaskUpdateEvent) => {
    const index = tasks.value.findIndex((t) => t.id === event.id)
    if (index >= 0) {
      tasks.value[index] = {
        ...tasks.value[index],
        status: event.status as TaskStatus,
        error: event.error,
      }
    } else {
      fetchTasks()
    }
  }

  return {
    tasks,
    loading,
    filter,
    filteredTasks,
    fetchTasks,
    createTask,
    handleTaskUpdate,
  }
})
```

**文件**: `frontend/src/stores/queue.ts`

```typescript
import { defineStore } from "pinia"
import { ref } from "vue"
import { useAPI } from "../composables/useAPI"
import type { QueueStatusEvent } from "../composables/useWebSocket"

export const useQueueStore = defineStore("queue", () => {
  const pending = ref(0)
  const paused = ref(false)
  const cooldowns = ref<string[]>([])

  const api = useAPI()

  const handleQueueStatus = (event: QueueStatusEvent) => {
    pending.value = event.pending
    paused.value = event.paused
    cooldowns.value = event.cooldowns
  }

  const pause = async () => {
    await api.controlQueue("pause")
    paused.value = true
  }

  const resume = async () => {
    await api.controlQueue("resume")
    paused.value = false
  }

  return {
    pending,
    paused,
    cooldowns,
    handleQueueStatus,
    pause,
    resume,
  }
})
```

**文件**: `frontend/src/stores/pipelines.ts`

```typescript
import { defineStore } from "pinia"
import { ref } from "vue"
import type { PipelineRecord, PipelineStage } from "../types"
import { useAPI } from "../composables/useAPI"
import type { PipelineUpdateEvent } from "../composables/useWebSocket"

export const usePipelinesStore = defineStore("pipelines", () => {
  const pipelines = ref<(PipelineRecord & { stages: PipelineStage[] })[]>([])
  const loading = ref(false)

  const api = useAPI()

  const fetchPipelines = async () => {
    loading.value = true
    try {
      const res = await api.getPipelines()
      pipelines.value = res.data.pipelines
    } finally {
      loading.value = false
    }
  }

  const handlePipelineUpdate = (event: PipelineUpdateEvent) => {
    const index = pipelines.value.findIndex((p) => p.id === event.id)
    if (index >= 0) {
      pipelines.value[index] = {
        ...pipelines.value[index],
        status: event.status as PipelineRecord["status"],
        current_stage: event.stage ?? pipelines.value[index].current_stage,
      }
    }
  }

  return {
    pipelines,
    loading,
    fetchPipelines,
    handlePipelineUpdate,
  }
})
```

**文件**: `frontend/src/stores/recurring.ts`

```typescript
import { defineStore } from "pinia"
import { ref } from "vue"
import type { RecurringRecord } from "../types"
import { useAPI } from "../composables/useAPI"

export const useRecurringStore = defineStore("recurring", () => {
  const items = ref<RecurringRecord[]>([])
  const loading = ref(false)

  const api = useAPI()

  const fetchRecurring = async () => {
    loading.value = true
    try {
      const res = await api.getRecurring()
      items.value = res.data.recurring
    } finally {
      loading.value = false
    }
  }

  const createItem = async (data: Parameters<typeof api.createRecurring>[0]) => {
    const res = await api.createRecurring(data)
    items.value.push(res.data)
    return res.data
  }

  const toggleItem = async (id: string, enabled: boolean) => {
    await api.updateRecurring(id, { enabled })
    const item = items.value.find((i) => i.id === id)
    if (item) item.enabled = enabled
  }

  const deleteItem = async (id: string) => {
    await api.deleteRecurring(id)
    items.value = items.value.filter((i) => i.id !== id)
  }

  return {
    items,
    loading,
    fetchRecurring,
    createItem,
    toggleItem,
    deleteItem,
  }
})
```

---

## Phase 4: 前端页面实现

### 4.1 Dashboard.vue

统计卡片 + 最近任务 + 活跃 Pipeline

```vue
<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6">
        <StatCard
          title="Pending"
          :value="queueStore.pending"
          icon="Clock"
          color="warning"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          title="Running"
          :value="runningCount"
          icon="VideoPlay"
          color="primary"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          title="Completed"
          :value="completedCount"
          icon="CircleCheck"
          color="success"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          title="Cooldown"
          :value="queueStore.cooldowns.length"
          icon="Snowflake"
          color="info"
        />
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <span>Recent Tasks</span>
              <el-button text type="primary" @click="$router.push('/tasks')">
                View All →
              </el-button>
            </div>
          </template>
          <el-table :data="recentTasks" stripe>
            <el-table-column label="Status" width="100">
              <template #default="{ row }">
                <StatusTag :status="row.status" />
              </template>
            </el-table-column>
            <el-table-column prop="prompt" label="Prompt" show-overflow-tooltip />
            <el-table-column label="Time" width="120">
              <template #default="{ row }">
                {{ formatTime(row.updated_at) }}
              </template>
            </el-table-column>
            <el-table-column label="" width="60">
              <template #default="{ row }">
                <el-button
                  text
                  type="primary"
                  @click="$router.push(`/tasks/${row.id}`)"
                >
                  →
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <span>Active Pipelines</span>
            </div>
          </template>
          <div v-if="activePipelines.length === 0" class="empty-text">
            No active pipelines
          </div>
          <div
            v-for="pl in activePipelines"
            :key="pl.id"
            class="pipeline-item"
          >
            <div class="pipeline-name">{{ pl.name }}</div>
            <el-progress
              :percentage="pipelineProgress(pl)"
              :status="pipelineStatus(pl)"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useTasksStore } from "../stores/tasks"
import { useQueueStore } from "../stores/queue"
import { usePipelinesStore } from "../stores/pipelines"
import { useWebSocket } from "../composables/useWebSocket"
import StatCard from "../components/StatCard.vue"
import StatusTag from "../components/StatusTag.vue"
import type { PipelineRecord, PipelineStage } from "../types"

const tasksStore = useTasksStore()
const queueStore = useQueueStore()
const pipelinesStore = usePipelinesStore()

useWebSocket()

const runningCount = computed(() =>
  tasksStore.tasks.filter((t) => t.status === "running").length
)
const completedCount = computed(() =>
  tasksStore.tasks.filter((t) => t.status === "completed").length
)
const recentTasks = computed(() =>
  tasksStore.tasks.slice(0, 10)
)
const activePipelines = computed(() =>
  pipelinesStore.pipelines.filter((p) => p.status === "running")
)

const formatTime = (ts: number) => {
  const diff = Date.now() - ts
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

const pipelineProgress = (pl: PipelineRecord & { stages: PipelineStage[] }) => {
  const completed = pl.stages.filter((s) => s.status === "completed").length
  return Math.round((completed / pl.stages.length) * 100)
}

const pipelineStatus = (pl: PipelineRecord) => {
  if (pl.status === "completed") return "success"
  if (pl.status === "failed") return "exception"
  return ""
}

onMounted(() => {
  tasksStore.fetchTasks()
  pipelinesStore.fetchPipelines()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-row {
  margin-bottom: 0;
}

.section-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-text {
  color: #909399;
  text-align: center;
  padding: 20px;
}

.pipeline-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.pipeline-item:last-child {
  border-bottom: none;
}

.pipeline-name {
  font-weight: 500;
  margin-bottom: 8px;
}
</style>
```

### 4.2 组件

**文件**: `frontend/src/components/StatCard.vue`

```vue
<template>
  <el-card class="stat-card" :class="`stat-card--${color}`">
    <div class="stat-icon">
      <el-icon :size="28">
        <component :is="icon" />
      </el-icon>
    </div>
    <div class="stat-content">
      <div class="stat-value">{{ value }}</div>
      <div class="stat-title">{{ title }}</div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: number
  icon: string
  color: "primary" | "success" | "warning" | "danger" | "info"
}>()
</script>

<style scoped>
.stat-card {
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card--primary .stat-icon {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.stat-card--success .stat-icon {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.stat-card--warning .stat-icon {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.stat-card--danger .stat-icon {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.stat-card--info .stat-icon {
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-title {
  font-size: 14px;
  color: #909399;
}
</style>
```

**文件**: `frontend/src/components/StatusTag.vue`

```vue
<template>
  <el-tag :type="tagType" effect="light" round>
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  status: string
}>()

const tagType = computed(() => {
  switch (props.status) {
    case "pending":
      return "warning"
    case "running":
      return ""
    case "completed":
      return "success"
    case "failed":
      return "danger"
    case "skipped":
      return "info"
    default:
      return "info"
  }
})

const label = computed(() => {
  return props.status.charAt(0).toUpperCase() + props.status.slice(1)
})
</script>
```

### 4.3 Tasks.vue

任务列表 + 提交表单（含 Task Chain 配置）

```vue
<template>
  <div class="tasks-page">
    <el-card class="submit-card">
      <template #header>
        <div class="card-header">
          <span>Submit New Task</span>
          <el-button text @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? "Hide" : "Show" }} Advanced
            <el-icon><ArrowDown v-if="!showAdvanced" /><ArrowUp v-else /></el-icon>
          </el-button>
        </div>
      </template>
      <el-form :model="form" label-position="top">
        <el-form-item label="Prompt" required>
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="3"
            placeholder="What should the agent do?"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Directory">
              <el-input v-model="form.directory" placeholder="/path/to/project" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Model">
              <el-input v-model="form.model" placeholder="default" />
            </el-form-item>
          </el-col>
        </el-row>

        <div v-if="showAdvanced" class="advanced-section">
          <el-divider content-position="left">Auto-Iteration (Task Chain)</el-divider>
          <el-form-item label="On Success">
            <el-input
              v-model="form.on_success"
              type="textarea"
              :rows="2"
              placeholder="Prompt to execute after success..."
            />
          </el-form-item>
          <el-form-item label="On Failure">
            <el-input
              v-model="form.on_failure"
              type="textarea"
              :rows="2"
              placeholder="Prompt to execute after failure..."
            />
          </el-form-item>
          <el-form-item label="Max Chain Depth">
            <el-input-number v-model="form.max_chain_depth" :min="0" :max="20" />
          </el-form-item>
        </div>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            Submit Task
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>Tasks</span>
          <el-radio-group v-model="tasksStore.filter" size="small">
            <el-radio-button label="">All</el-radio-button>
            <el-radio-button label="pending">Pending</el-radio-button>
            <el-radio-button label="running">Running</el-radio-button>
            <el-radio-button label="completed">Completed</el-radio-button>
            <el-radio-button label="failed">Failed</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="tasksStore.filteredTasks" v-loading="tasksStore.loading" stripe>
        <el-table-column label="Status" width="120">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="prompt" label="Prompt" show-overflow-tooltip />
        <el-table-column label="Chain" width="100">
          <template #default="{ row }">
            <span v-if="row.chain_depth">
              Depth {{ row.chain_depth }}/{{ row.max_chain_depth }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Time" width="120">
          <template #default="{ row }">
            {{ formatTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="120">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              @click="$router.push(`/tasks/${row.id}`)"
            >
              Detail
            </el-button>
            <el-button
              v-if="row.status === 'failed'"
              text
              type="warning"
              @click="handleRetry(row.id)"
            >
              Retry
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { useTasksStore } from "../stores/tasks"
import StatusTag from "../components/StatusTag.vue"
import { useAPI } from "../composables/useAPI"

const tasksStore = useTasksStore()
const api = useAPI()

const showAdvanced = ref(false)
const submitting = ref(false)

const form = reactive({
  prompt: "",
  directory: "",
  model: "",
  on_success: "",
  on_failure: "",
  max_chain_depth: 10,
})

const handleSubmit = async () => {
  if (!form.prompt.trim()) {
    ElMessage.warning("Please enter a prompt")
    return
  }
  submitting.value = true
  try {
    await tasksStore.createTask({
      prompt: form.prompt,
      directory: form.directory || undefined,
      model: form.model || undefined,
      on_success: form.on_success || undefined,
      on_failure: form.on_failure || undefined,
      max_chain_depth: form.max_chain_depth,
    })
    ElMessage.success("Task submitted")
    form.prompt = ""
    form.on_success = ""
    form.on_failure = ""
  } catch (err) {
    ElMessage.error("Failed to submit task")
  } finally {
    submitting.value = false
  }
}

const handleRetry = async (id: string) => {
  try {
    await api.retryTask(id)
    ElMessage.success("Task queued for retry")
    tasksStore.fetchTasks()
  } catch (err) {
    ElMessage.error("Failed to retry task")
  }
}

const formatTime = (ts: number) => {
  const diff = Date.now() - ts
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

onMounted(() => {
  tasksStore.fetchTasks()
})
</script>

<style scoped>
.tasks-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.submit-card,
.list-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.advanced-section {
  margin-top: 16px;
}
</style>
```

### 4.4 TaskDetail.vue

任务详情 + 任务链可视化 + Timeline

### 4.5 Pipelines.vue

Pipeline 列表 + 创建表单（动态 stage）+ StageProgress 组件

### 4.6 Recurring.vue

定时任务列表 + 创建表单 + 启用/禁用开关

### 4.7 Queue.vue

队列控制（暂停/恢复）+ Cooldown 状态

---

## Phase 5: 后端静态文件服务

### 5.1 Hono serveStatic 集成

**文件**: `src/endpoints/rest-api.ts`

在所有 API 路由之后添加：

```typescript
import { serveStatic } from "@hono/node-server/serve-static"

// ... 所有 /v1/* 路由 ...

// 静态文件服务（生产环境）
app.use("/assets/*", serveStatic({ root: "./public" }))
app.get("*", serveStatic({ path: "./public/index.html" }))
```

### 5.2 局域网访问配置

**文件**: `src/config/defaults.ts`

```typescript
export const DEFAULTS = {
  daemon: {
    port: 8765,
    host: "0.0.0.0",  // 从 127.0.0.1 改为 0.0.0.0
    logLevel: "info" as const,
  },
  // ...
}
```

---

## Phase 6: 构建与集成

### 6.1 package.json 脚本更新

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "tsx watch src/daemon.ts",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "tsup",
    "start": "node dist/daemon.js",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

### 6.2 tsup.config.ts 更新

复制前端构建产物到 dist/public：

```typescript
import { defineConfig } from "tsup"
import { copySync } from "fs-extra"

export default defineConfig({
  entry: ["src/daemon.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  outDir: "dist",
  target: "node22",
  platform: "node",
  splitting: false,
  sourcemap: false,
  minify: false,
  treeshake: true,
  tsconfig: "tsconfig.json",
  onSuccess: async () => {
    copySync("frontend/dist", "dist/public")
  },
})
```

新增依赖：`fs-extra`

### 6.3 验证流程

```bash
# 1. 安装所有依赖
npm install
cd frontend && npm install && cd ..

# 2. 开发模式（前后端并行）
npm run dev
# 后端: http://127.0.0.1:8765
# 前端: http://127.0.0.1:5173 (Vite HMR)

# 3. 生产构建
npm run build
# 输出: dist/daemon.js + dist/public/

# 4. 生产运行
OS_HOST=0.0.0.0 npm start
# 访问: http://<局域网IP>:8765

# 5. 类型检查
npm run typecheck
cd frontend && npx vue-tsc --noEmit

# 6. 测试
npm test
```

---

## 实施顺序

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Phase 1 | Task Chain 后端 | 2-3 小时 |
| Phase 2 | Vue 项目初始化 | 1 小时 |
| Phase 3 | 前端核心层 | 2-3 小时 |
| Phase 4 | 前端页面 | 4-6 小时 |
| Phase 5 | 静态文件服务 | 30 分钟 |
| Phase 6 | 构建集成 | 1 小时 |

**总计**: 约 1-2 天

---

## 待确认

准备就绪后，按 Phase 顺序开始实施。
