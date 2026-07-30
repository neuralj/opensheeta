<template>
  <div class="agents-page">
    <el-card class="agents-card">
      <template #header>
        <div class="card-header">
          <span>Agents</span>
          <el-button text @click="agentsStore.fetchAgents()">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>

      <el-divider content-position="left">OpenCode Agents</el-divider>
      <div v-if="agentsStore.agents.length === 0" class="empty-section">No agents available</div>
      <el-row :gutter="16">
        <el-col :span="8" v-for="agent in agentsStore.agents" :key="agent.name">
          <el-card class="agent-card" shadow="hover">
            <div class="agent-name">{{ agent.name }}</div>
            <div class="agent-desc">{{ agent.description }}</div>
            <el-tag size="small" effect="light" round>{{ agent.mode }}</el-tag>
          </el-card>
        </el-col>
      </el-row>

      <el-divider content-position="left">Personas</el-divider>
      <div v-if="agentsStore.personas.length === 0" class="empty-section">No personas loaded</div>
      <el-row :gutter="16">
        <el-col :span="8" v-for="persona in agentsStore.personas" :key="persona.id">
          <el-card class="persona-card" shadow="hover">
            <div class="persona-header">
              <span class="persona-name">{{ persona.name }}</span>
              <el-tag :type="persona.family === 'code' ? 'danger' : 'info'" size="small" effect="light" round>
                {{ persona.family }}
              </el-tag>
            </div>
            <div class="persona-meta">
              <el-tag size="small" effect="plain">{{ persona.workspace }}</el-tag>
              <el-tag size="small" effect="plain">{{ persona.default_permission_mode }}</el-tag>
            </div>
            <div class="persona-prompt">{{ persona.system_prompt.slice(0, 120) }}{{ persona.system_prompt.length > 120 ? '...' : '' }}</div>
            <div class="persona-flags">
              <el-tag v-if="persona.connectors" type="success" size="small" effect="light">Connectors</el-tag>
              <el-tag v-if="persona.messaging" type="warning" size="small" effect="light">Messaging</el-tag>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue"
import { useAgentsStore } from "../stores/agents"

const agentsStore = useAgentsStore()

onMounted(() => {
  agentsStore.fetchAgents()
})
</script>

<style scoped>
.agents-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.agents-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-section {
  color: #909399;
  text-align: center;
  padding: 20px;
}

.agent-card, .persona-card {
  margin-bottom: 16px;
  border-radius: 10px;
}

.agent-name, .persona-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.agent-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.persona-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.persona-meta {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.persona-prompt {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-bottom: 8px;
}

.persona-flags {
  display: flex;
  gap: 6px;
}
</style>
