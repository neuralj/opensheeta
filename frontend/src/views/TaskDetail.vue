<template>
  <div class="task-detail">
    <el-page-header @back="$router.push('/tasks')" title="Back to Tasks" />

    <el-card v-if="task" class="detail-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="task-id">{{ task.id }}</span>
            <StatusTag :status="task.status" />
          </div>
          <div>
            <el-button v-if="task.status === 'failed'" type="warning" @click="handleRetry">Retry</el-button>
            <el-button v-if="task.status === 'running' || task.status === 'pending'" type="danger" @click="handleAbort">Abort</el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="Prompt" :span="2">{{ task.prompt }}</el-descriptions-item>
        <el-descriptions-item label="Directory">{{ task.directory || "-" }}</el-descriptions-item>
        <el-descriptions-item label="Model">{{ task.model || "default" }}</el-descriptions-item>
        <el-descriptions-item label="Attempts">{{ task.attempts }} / {{ task.max_attempts }}</el-descriptions-item>
        <el-descriptions-item label="Created">{{ new Date(task.created_at).toLocaleString() }}</el-descriptions-item>
        <el-descriptions-item v-if="task.error" label="Error" :span="2">
          <span class="error-text">{{ task.error }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="task.on_success || task.on_failure" class="chain-config">
        <el-divider content-position="left">Task Chain</el-divider>
        <el-descriptions :column="1" border>
          <el-descriptions-item v-if="task.on_success" label="On Success">{{ task.on_success }}</el-descriptions-item>
          <el-descriptions-item v-if="task.on_failure" label="On Failure">{{ task.on_failure }}</el-descriptions-item>
          <el-descriptions-item label="Chain Depth">{{ task.chain_depth ?? 0 }} / {{ task.max_chain_depth ?? 10 }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <el-card v-if="chainInfo" class="chain-card">
      <template #header>
        <span>Task Chain</span>
      </template>
      <div class="chain-flow">
        <div v-if="chainInfo.parent" class="chain-node chain-node--parent">
          <StatusTag :status="chainInfo.parent.status" />
          <span>{{ chainInfo.parent.prompt.slice(0, 40) }}...</span>
          <span class="chain-arrow">-></span>
        </div>
        <div class="chain-node chain-node--current">
          <StatusTag :status="task?.status ?? ''" />
          <span class="current-label">{{ task?.prompt.slice(0, 40) }}...</span>
        </div>
        <div v-for="child in chainInfo.children" :key="child.id" class="chain-node chain-node--child">
          <span class="chain-arrow">-></span>
          <StatusTag :status="child.status" />
          <span>{{ child.prompt.slice(0, 40) }}...</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ElMessage } from "element-plus"
import { useAPI, type TaskChainInfo } from "../composables/useAPI"
import type { TaskRecord } from "../types"
import StatusTag from "../components/StatusTag.vue"

const route = useRoute()
const router = useRouter()
const api = useAPI()

const task = ref<TaskRecord | null>(null)
const chainInfo = ref<TaskChainInfo | null>(null)

const loadData = async () => {
  const id = route.params.id as string
  try {
    const [taskRes, chainRes] = await Promise.all([
      api.getTask(id),
      api.getTaskChain(id),
    ])
    task.value = taskRes.data
    chainInfo.value = chainRes.data
  } catch {
    ElMessage.error("Failed to load task")
  }
}

const handleRetry = async () => {
  if (!task.value) return
  try {
    await api.retryTask(task.value.id)
    ElMessage.success("Task queued for retry")
    loadData()
  } catch {
    ElMessage.error("Failed to retry")
  }
}

const handleAbort = async () => {
  if (!task.value) return
  try {
    await api.abortTask(task.value.id)
    ElMessage.success("Task aborted")
    loadData()
  } catch {
    ElMessage.error("Failed to abort")
  }
}

onMounted(loadData)
</script>

<style scoped>
.task-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-card, .chain-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-id {
  font-family: monospace;
  font-size: 14px;
  margin-right: 12px;
  color: #606266;
}

.error-text {
  color: #f56c6c;
  font-family: monospace;
}

.chain-config {
  margin-top: 16px;
}

.chain-flow {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chain-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f5f7fa;
}

.chain-node--current {
  background: rgba(64, 158, 255, 0.1);
  border: 1px solid rgba(64, 158, 255, 0.3);
}

.current-label {
  font-weight: 500;
}

.chain-arrow {
  color: #909399;
  font-family: monospace;
}
</style>
