<template>
  <div class="pipelines-page">
    <el-card class="create-card">
      <template #header>
        <div class="card-header">
          <span>Create Pipeline</span>
          <el-button text @click="showCreate = !showCreate">
            {{ showCreate ? "Hide" : "Show" }}
          </el-button>
        </div>
      </template>
      <el-form v-if="showCreate" :model="form" label-position="top">
        <el-form-item label="Name">
          <el-input v-model="form.name" placeholder="Pipeline name" />
        </el-form-item>
        <el-form-item label="Directory">
          <el-input v-model="form.directory" placeholder="/path/to/project" />
        </el-form-item>
        <el-divider content-position="left">Stages</el-divider>
        <div v-for="(stage, index) in form.stages" :key="index" class="stage-form">
          <el-row :gutter="12">
            <el-col :span="6">
              <el-input v-model="stage.label" placeholder="Label" />
            </el-col>
            <el-col :span="16">
              <el-input v-model="stage.prompt" placeholder="Prompt" />
            </el-col>
            <el-col :span="2">
              <el-button type="danger" text @click="removeStage(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-col>
          </el-row>
        </div>
        <el-button text type="primary" @click="addStage">+ Add Stage</el-button>
        <el-form-item style="margin-top: 16px">
          <el-button type="primary" @click="handleCreate" :loading="creating">Create & Start</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-card">
      <template #header>
        <span>Pipelines</span>
      </template>
      <div v-if="pipelinesStore.pipelines.length === 0" class="empty-text">
        No pipelines yet
      </div>
      <div v-for="pl in pipelinesStore.pipelines" :key="pl.id" class="pipeline-row">
        <div class="pipeline-header">
          <div>
            <span class="pipeline-name">{{ pl.name }}</span>
            <StatusTag :status="pl.status" />
          </div>
          <div>
            <el-button
              v-if="pl.status === 'running'"
              type="danger"
              text
              @click="handleAbort(pl.id)"
            >Abort</el-button>
            <el-button type="danger" text @click="handleDelete(pl.id)">Delete</el-button>
          </div>
        </div>
        <StageProgress :stages="pl.stages" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { usePipelinesStore } from "../stores/pipelines"
import { useAPI } from "../composables/useAPI"
import StatusTag from "../components/StatusTag.vue"
import StageProgress from "../components/StageProgress.vue"

const pipelinesStore = usePipelinesStore()
const api = useAPI()

const showCreate = ref(false)
const creating = ref(false)

const form = reactive({
  name: "",
  directory: "",
  stages: [{ label: "", prompt: "" }],
})

const addStage = () => {
  form.stages.push({ label: "", prompt: "" })
}

const removeStage = (index: number) => {
  if (form.stages.length > 1) form.stages.splice(index, 1)
}

const handleCreate = async () => {
  const validStages = form.stages.filter((s) => s.prompt.trim())
  if (validStages.length === 0) {
    ElMessage.warning("Add at least one stage with a prompt")
    return
  }
  creating.value = true
  try {
    await api.createPipeline({
      name: form.name || "Pipeline",
      directory: form.directory || undefined,
      stages: validStages.map((s) => ({
        label: s.label || undefined,
        prompt: s.prompt,
      })),
    })
    ElMessage.success("Pipeline created and started")
    form.name = ""
    form.directory = ""
    form.stages = [{ label: "", prompt: "" }]
    showCreate.value = false
    pipelinesStore.fetchPipelines()
  } catch {
    ElMessage.error("Failed to create pipeline")
  } finally {
    creating.value = false
  }
}

const handleAbort = async (id: string) => {
  try {
    await api.abortPipeline(id)
    ElMessage.success("Pipeline aborted")
    pipelinesStore.fetchPipelines()
  } catch {
    ElMessage.error("Failed to abort")
  }
}

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm("Delete this pipeline?")
    await api.deletePipeline(id)
    pipelinesStore.fetchPipelines()
  } catch {}
}

onMounted(() => {
  pipelinesStore.fetchPipelines()
})
</script>

<style scoped>
.pipelines-page {
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

.stage-form {
  margin-bottom: 12px;
}

.empty-text {
  color: #909399;
  text-align: center;
  padding: 40px;
}

.pipeline-row {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.pipeline-row:last-child {
  border-bottom: none;
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pipeline-name {
  font-weight: 600;
  margin-right: 12px;
}
</style>
