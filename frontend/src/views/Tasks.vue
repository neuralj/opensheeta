<template>
  <div class="tasks-page">
    <el-card class="submit-card">
      <template #header>
        <div class="card-header">
          <span>Submit New Task</span>
          <el-button text @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? "Hide" : "Show" }} Advanced
          </el-button>
        </div>
      </template>
      <el-form :model="form" label-position="top">
        <el-form-item label="Prompt" required>
          <el-input v-model="form.prompt" type="textarea" :rows="3" placeholder="What should the agent do?" />
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
            <el-input v-model="form.on_success" type="textarea" :rows="2" placeholder="Prompt to execute after success..." />
          </el-form-item>
          <el-form-item label="On Failure">
            <el-input v-model="form.on_failure" type="textarea" :rows="2" placeholder="Prompt to execute after failure..." />
          </el-form-item>
          <el-form-item label="Max Chain Depth">
            <el-input-number v-model="form.max_chain_depth" :min="0" :max="20" />
          </el-form-item>
        </div>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">Submit Task</el-button>
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
            <span v-if="row.chain_depth">Depth {{ row.chain_depth }}/{{ row.max_chain_depth }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Time" width="120">
          <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="140">
          <template #default="{ row }">
            <el-button text type="primary" @click="$router.push(`/tasks/${row.id}`)">Detail</el-button>
            <el-button v-if="row.status === 'failed'" text type="warning" @click="handleRetry(row.id)">Retry</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue"
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

watch(() => tasksStore.filter, () => {
  tasksStore.fetchTasks()
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
  } catch {
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
  } catch {
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

.submit-card, .list-card {
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
