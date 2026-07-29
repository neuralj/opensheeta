<template>
  <div class="queue-page">
    <el-card class="control-card">
      <template #header>
        <span>Queue Control</span>
      </template>
      <div class="control-content">
        <div class="status-row">
          <div class="status-item">
            <span class="status-label">Status</span>
            <el-tag :type="queueStore.paused ? 'danger' : 'success'" effect="light" round>
              {{ queueStore.paused ? "Paused" : "Running" }}
            </el-tag>
          </div>
          <div class="status-item">
            <span class="status-label">Pending Tasks</span>
            <span class="status-value">{{ queueStore.pending }}</span>
          </div>
        </div>
        <div class="action-row">
          <el-button
            v-if="!queueStore.paused"
            type="warning"
            @click="queueStore.pause()"
          >
            <el-icon><VideoPause /></el-icon>
            Pause Queue
          </el-button>
          <el-button
            v-else
            type="success"
            @click="queueStore.resume()"
          >
            <el-icon><VideoPlay /></el-icon>
            Resume Queue
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="cooldown-card">
      <template #header>
        <div class="card-header">
          <span>Cooldown Agents</span>
          <el-tag v-if="queueStore.cooldowns.length > 0" type="info" effect="light" round>
            {{ queueStore.cooldowns.length }} active
          </el-tag>
        </div>
      </template>
      <div v-if="queueStore.cooldowns.length === 0" class="empty-text">
        No agents in cooldown
      </div>
      <div v-else class="cooldown-list">
        <div v-for="agentId in queueStore.cooldowns" :key="agentId" class="cooldown-item">
          <el-icon class="cooldown-icon"><Snowflake /></el-icon>
          <div class="cooldown-info">
            <div class="cooldown-agent">{{ agentId }}</div>
            <div class="cooldown-desc">Probing for recovery...</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useQueueStore } from "../stores/queue"
import { useWebSocket } from "../composables/useWebSocket"

const queueStore = useQueueStore()
useWebSocket()
</script>

<style scoped>
.queue-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-card, .cooldown-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-row {
  display: flex;
  gap: 40px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-label {
  color: #909399;
  font-size: 14px;
}

.status-value {
  font-size: 24px;
  font-weight: 700;
}

.action-row {
  padding-top: 8px;
}

.empty-text {
  color: #909399;
  text-align: center;
  padding: 40px;
}

.cooldown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cooldown-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.cooldown-icon {
  font-size: 24px;
  color: #409eff;
}

.cooldown-agent {
  font-family: monospace;
  font-size: 14px;
  font-weight: 500;
}

.cooldown-desc {
  font-size: 12px;
  color: #909399;
}
</style>
