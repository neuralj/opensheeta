<template>
  <el-card class="approval-dialog" shadow="hover">
    <div class="approval-header">
      <el-icon :size="20" color="#e6a23c"><WarningFilled /></el-icon>
      <span class="approval-title">Permission Required</span>
    </div>
    <div class="approval-body">
      <div class="approval-tool">
        <span class="label">Tool:</span>
        <code>{{ toolName }}</code>
      </div>
      <div v-if="reason" class="approval-reason">
        <span class="label">Reason:</span>
        <span>{{ reason }}</span>
      </div>
      <div v-if="formattedArgs" class="approval-args">
        <span class="label">Arguments:</span>
        <pre>{{ formattedArgs }}</pre>
      </div>
    </div>
    <div class="approval-actions">
      <el-button type="danger" @click="$emit('deny')">Deny</el-button>
      <el-button type="primary" @click="$emit('approve')">Allow</el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  toolName: string
  toolArgs: Record<string, unknown>
  reason: string
}>()

defineEmits<{
  approve: []
  deny: []
}>()

const formattedArgs = computed(() => {
  try {
    return JSON.stringify(props.toolArgs, null, 2)
  } catch {
    return ""
  }
})
</script>

<style scoped>
.approval-dialog {
  border: 2px solid #e6a23c;
  border-radius: 12px;
  margin-bottom: 12px;
}

.approval-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.approval-title {
  font-weight: 600;
  font-size: 15px;
}

.approval-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.label {
  color: #909399;
  font-size: 12px;
}

.approval-tool code {
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.approval-args pre {
  background: #f5f7fa;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 120px;
  margin: 4px 0 0;
}

.approval-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
