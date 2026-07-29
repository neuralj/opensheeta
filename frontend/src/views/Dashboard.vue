<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6">
        <StatCard title="Pending" :value="queueStore.pending" icon="Clock" color="warning" />
      </el-col>
      <el-col :span="6">
        <StatCard title="Running" :value="runningCount" icon="VideoPlay" color="primary" />
      </el-col>
      <el-col :span="6">
        <StatCard title="Completed" :value="completedCount" icon="CircleCheck" color="success" />
      </el-col>
      <el-col :span="6">
        <StatCard title="Cooldown" :value="queueStore.cooldowns.length" icon="Snowflake" color="info" />
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
            <span>Active Pipelines</span>
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
const recentTasks = computed(() => tasksStore.tasks.slice(0, 10))
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
  return undefined
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
