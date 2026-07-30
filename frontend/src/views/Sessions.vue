<template>
  <div class="sessions-page">
    <el-card class="create-card">
      <template #header>
        <div class="card-header">
          <span>New Session</span>
        </div>
      </template>
      <el-form inline>
        <el-form-item label="Title">
          <el-input v-model="newTitle" placeholder="Session title" @keyup.enter="handleCreate" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCreate" :loading="creating">Create</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>Sessions</span>
          <el-button text @click="sessionsStore.fetchSessions">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>
      <el-table :data="sessionsStore.sessions" v-loading="sessionsStore.loading" stripe>
        <el-table-column prop="title" label="Title" show-overflow-tooltip />
        <el-table-column label="Created" width="160">
          <template #default="{ row }">
            {{ new Date(row.time.created).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="" width="140">
          <template #default="{ row }">
            <el-button text type="primary" @click="$router.push(`/sessions/${row.id}`)">
              Open
            </el-button>
            <el-button text type="danger" @click="handleDelete(row.id)">
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { useSessionsStore } from "../stores/sessions"

const sessionsStore = useSessionsStore()
const newTitle = ref("")
const creating = ref(false)

const handleCreate = async () => {
  creating.value = true
  try {
    const session = await sessionsStore.createSession(newTitle.value || undefined)
    ElMessage.success("Session created")
    newTitle.value = ""
    return session
  } catch {
    ElMessage.error("Failed to create session")
  } finally {
    creating.value = false
  }
}

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm("Delete this session?")
    await sessionsStore.deleteSession(id)
    ElMessage.success("Session deleted")
  } catch {}
}

onMounted(() => {
  sessionsStore.fetchSessions()
})
</script>

<style scoped>
.sessions-page {
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
