<template>
  <div class="recurring-page">
    <el-card class="create-card">
      <template #header>
        <div class="card-header">
          <span>Schedule Recurring Task</span>
          <el-button text @click="showCreate = !showCreate">
            {{ showCreate ? "Hide" : "Show" }}
          </el-button>
        </div>
      </template>
      <el-form v-if="showCreate" :model="form" label-position="top">
        <el-form-item label="Name" required>
          <el-input v-model="form.name" placeholder="Task name" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Cron Expression" required>
              <el-input v-model="form.cron" placeholder="0 2 * * *" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Timezone">
              <el-input v-model="form.timezone" placeholder="UTC" />
            </el-form-item>
          </el-col>
        </el-row>
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
        <el-form-item>
          <el-button type="primary" @click="handleCreate" :loading="creating">Create</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-card">
      <template #header>
        <span>Recurring Tasks</span>
      </template>
      <el-table :data="recurringStore.items" v-loading="recurringStore.loading" stripe>
        <el-table-column prop="name" label="Name" width="200" />
        <el-table-column prop="cron" label="Cron" width="140">
          <template #default="{ row }">
            <code>{{ row.cron }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="prompt" label="Prompt" show-overflow-tooltip />
        <el-table-column label="Last Run" width="140">
          <template #default="{ row }">
            {{ row.last_run_at ? formatTime(row.last_run_at) : "Never" }}
          </template>
        </el-table-column>
        <el-table-column label="Enabled" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="(val: boolean) => handleToggle(row.id, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="" width="80">
          <template #default="{ row }">
            <el-button type="danger" text @click="handleDelete(row.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { useRecurringStore } from "../stores/recurring"

const recurringStore = useRecurringStore()

const showCreate = ref(false)
const creating = ref(false)

const form = reactive({
  name: "",
  cron: "",
  prompt: "",
  directory: "",
  model: "",
  timezone: "",
})

const handleCreate = async () => {
  if (!form.name.trim() || !form.cron.trim() || !form.prompt.trim()) {
    ElMessage.warning("Please fill in all required fields")
    return
  }
  creating.value = true
  try {
    await recurringStore.createItem({
      name: form.name,
      cron: form.cron,
      prompt: form.prompt,
      directory: form.directory || undefined,
      model: form.model || undefined,
      timezone: form.timezone || undefined,
    })
    ElMessage.success("Recurring task created")
    form.name = ""
    form.cron = ""
    form.prompt = ""
    form.directory = ""
    form.model = ""
    form.timezone = ""
    showCreate.value = false
  } catch {
    ElMessage.error("Failed to create")
  } finally {
    creating.value = false
  }
}

const handleToggle = async (id: string, enabled: boolean) => {
  try {
    await recurringStore.toggleItem(id, enabled)
  } catch {
    ElMessage.error("Failed to update")
  }
}

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm("Delete this recurring task?")
    await recurringStore.deleteItem(id)
  } catch {}
}

const formatTime = (ts: number) => {
  const diff = Date.now() - ts
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

onMounted(() => {
  recurringStore.fetchRecurring()
})
</script>

<style scoped>
.recurring-page {
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
</style>
