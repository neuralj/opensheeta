<template>
  <div class="connection-badge">
    <span class="badge-dot" :class="connected ? 'dot--connected' : 'dot--disconnected'"></span>
    <span class="badge-text">{{ connected ? 'Connected' : 'Disconnected' }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  connected: boolean
}>()
</script>

<style scoped>
.connection-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--connected {
  background: #67c23a;
  box-shadow: 0 0 4px rgba(103, 194, 58, 0.4);
}

.dot--disconnected {
  background: #f56c6c;
  box-shadow: 0 0 4px rgba(245, 108, 108, 0.4);
}
</style>
