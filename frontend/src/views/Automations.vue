<template>
  <div class="automations-page">
    <el-card class="create-card">
      <template #header>
        <div class="card-header">
          <span>Schedule Automation</span>
          <el-button text @click="showCreate = !showCreate">
            {{ showCreate ? "Hide" : "Show" }}
          </el-button>
        </div>
      </template>
      <el-form v-if="showCreate" :model="form" label-position="top">
        <el-form-item label="Title" required>
          <el-input v-model="form.title" placeholder="Automation title" />
        </el-form-item>
        <el-form-item label="Instructions" required>
          <el-input v-model="form.instructions" type="textarea" :rows="3" placeholder="What should the agent do?" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="Cron" required>
              <el-input v-model="form.cron" placeholder="0 2 * * *" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Timezone">
              <el-input v-model="form.timezone" placeholder="UTC" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Agent">
              <el-input v-model="form.agent" placeholder="cowork" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" @click="handleCreate" :loading="creating">Create</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>Automations</span>
          <el-button text @click="fetchData">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>

      <div v-if="automations.length === 0" class="empty-text">No automations configured</div>

      <el-table v-else :data="automations" stripe>
        <el-table-column prop="title" label="Title" width="200" />
        <el-table-column prop="cron" label="Cron" width="120">
          <template #default="{ row }">
            <code>{{ row.cron }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="instructions" label="Instructions" show-overflow-tooltip />
        <el-table-column label="Last Run" width="140">
          <template #default="{ row }">
            {{ row.last_run ? new Date(row.last_run * 1000).toLocaleString() : "Never" }}
          </template>
        </el-table-column>
        <el-table-column label="Enabled" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small" effect="light" round>
              {{ row.enabled ? "Yes" : "No" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="" width="120">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="viewRuns(row.id)">Runs</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row.id)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showRuns" title="Run History" width="700px">
      <el-table :data="runs" stripe>
        <el-table-column prop="run_id" label="Run ID" width="180" show-overflow-tooltip />
        <el-table-column label="Status" width="100">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="Started" width="160">
          <template #default="{ row }">
            {{ new Date(row.started_at * 1000).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="trigger" label="Trigger" width="100" />
        <el-table-column prop="error" label="Error" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { useAPI } from "../composables/useAPI"
import type { ScheduledTask, AutomationRun } from "../types"
import StatusTag from "../components/StatusTag.vue"

const api = useAPI()

const automations = ref<ScheduledTask[]>([])
const runs = ref<AutomationRun[]>([])
const showCreate = ref(false)
const showRuns = ref(false)
const creating = ref(false)

const form = reactive({
  title: "",
  instructions: "",
  cron: "",
  timezone: "UTC",
  agent: "",
})

const fetchData = async () => {
  try {
    const res = await api.getAutomations()
    automations.value = res.data.automations
  } catch {}
}

const handleCreate = async () => {
  if (!form.title.trim() || !form.instructions.trim() || !form.cron.trim()) {
    ElMessage.warning("Please fill in all required fields")
    return
  }
  creating.value = true
  try {
    await api.createAutomation({
      title: form.title,
      instructions: form.instructions,
      cron: form.cron,
      timezone: form.timezone || undefined,
      agent: form.agent || undefined,
    })
    ElMessage.success("Automation created")
    form.title = ""
    form.instructions = ""
    form.cron = ""
    form.timezone = "UTC"
    form.agent = ""
    showCreate.value = false
    fetchData()
  } catch {
    ElMessage.error("Failed to create")
  } finally {
    creating.value = false
  }
}

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm("Delete this automation?")
    await api.deleteAutomation(id)
    ElMessage.success("Deleted")
    fetchData()
  } catch {}
}

const viewRuns = async (id: string) => {
  try {
    const res = await api.getAutomationRuns(id)
    runs.value = res.data.runs
    showRuns.value = true
  } catch {
    ElMessage.error("Failed to load runs")
  }
}

onMounted(fetchData)
</script>

<style scoped>
.automations-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.create-card, .list-card {
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
  padding: 40px;
}
</style>
