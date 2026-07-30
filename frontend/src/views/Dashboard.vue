<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-row">
      <el-col :span="5">
        <StatCard title="Pending" :value="queueStore.pending" icon="Clock" color="warning" />
      </el-col>
      <el-col :span="5">
        <StatCard title="Running" :value="runningCount" icon="VideoPlay" color="primary" />
      </el-col>
      <el-col :span="5">
        <StatCard title="Completed" :value="completedCount" icon="CircleCheck" color="success" />
      </el-col>
      <el-col :span="5">
        <StatCard title="Cooldown" :value="queueStore.cooldowns.length" icon="Snowflake" color="info" />
      </el-col>
      <el-col :span="4">
        <el-card class="status-card">
          <div class="status-content">
            <ConnectionBadge :connected="healthStore.wsConnected" />
            <div class="status-detail">
              <span class="status-label">OpenCode</span>
              <el-tag :type="opencodeStatusType" size="small" effect="light" round>
                {{ healthStore.health?.opencode ?? "unknown" }}
              </el-tag>
            </div>
            <div class="status-detail">
              <span class="status-label">Mode</span>
              <el-tag size="small" effect="light" round>{{ healthStore.health?.mode ?? "-" }}</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <span>Recent Tasks</span>
              <el-button text type="primary" @click="$router.push('/tasks')">View All</el-button>
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
                <el-button text type="primary" @click="$router.push(`/tasks/${row.id}`)">
                  <el-icon><ArrowRight /></el-icon>
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
          <div v-for="pl in activePipelines" :key="pl.id" class="pipeline-item">
            <div class="pipeline-name">{{ pl.name }}</div>
            <el-progress
              :percentage="pipelineProgress(pl)"
              :status="pipelineStatus(pl)"
            />
          </div>
        </el-card>

        <el-card class="section-card" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>Sessions</span>
              <el-button text type="primary" @click="$router.push('/sessions')">View All</el-button>
            </div>
          </template>
          <div v-if="sessionsStore.sessions.length === 0" class="empty-text">
            No sessions
          </div>
          <div v-for="s in sessionsStore.sessions.slice(0, 5)" :key="s.id" class="session-item" @click="$router.push(`/sessions/${s.id}`)">
            <span class="session-name">{{ s.title || s.id.slice(0, 12) }}</span>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </el-card>

        <el-card class="section-card" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>Inbox</span>
              <el-badge :value="inboxStore.pendingCount" :hidden="inboxStore.pendingCount === 0" type="primary">
                <el-button text type="primary" @click="$router.push('/inbox')">View</el-button>
              </el-badge>
            </div>
          </template>
          <div v-if="inboxStore.pendingCount === 0" class="empty-text">
            No pending items
          </div>
          <div v-for="item in inboxStore.items.slice(0, 3)" :key="item.id" class="inbox-item">
            <el-tag :type="inboxKindType(item.kind)" size="small" effect="light" round>{{ item.kind }}</el-tag>
            <span class="inbox-title">{{ item.title }}</span>
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
import { useSessionsStore } from "../stores/sessions"
import { useInboxStore } from "../stores/inbox"
import { useHealthStore } from "../stores/health"
import { useWebSocket } from "../composables/useWebSocket"
import StatCard from "../components/StatCard.vue"
import StatusTag from "../components/StatusTag.vue"
import ConnectionBadge from "../components/ConnectionBadge.vue"
import type { PipelineRecord, PipelineStage, InboxKind } from "../types"

const tasksStore = useTasksStore()
const queueStore = useQueueStore()
const pipelinesStore = usePipelinesStore()
const sessionsStore = useSessionsStore()
const inboxStore = useInboxStore()
const healthStore = useHealthStore()

useWebSocket()

const runningCount = computed(() =>
  tasksStore.tasks.filter((t) => t.status === "running").length
)
const completedCount = computed(() =>
  tasksStore.tasks.filter((t) => t.status === "completed").length
)
const recentTasks = computed(() => tasksStore.tasks.slice(0, 10))
const activePipelines = computed(() =>
  pipelinesStore.pipelines.filter((p) => p.status === "running")
)

const opencodeStatusType = computed(() => {
  if (healthStore.health?.opencode === "connected") return "success"
  return "danger"
})

const inboxKindType = (kind: InboxKind) => {
  switch (kind) {
    case "approval": return "warning"
    case "question": return ""
    case "directory": return "danger"
    case "plan": return "success"
    default: return "info"
  }
}

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
  return undefined
}

onMounted(() => {
  tasksStore.fetchTasks()
  pipelinesStore.fetchPipelines()
  sessionsStore.fetchSessions()
  inboxStore.fetchInbox()
  healthStore.fetchHealth()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  border-radius: 12px;
}

.status-card {
  border-radius: 12px;
  display: flex;
  align-items: center;
}

.status-card :deep(.el-card__body) {
  width: 100%;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 13px;
  color: #909399;
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

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.session-item:hover {
  background: #f5f7fa;
}

.session-item:last-child {
  border-bottom: none;
}

.session-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.inbox-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
