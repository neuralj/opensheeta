<template>
  <div class="tool-call-card" :class="`tool-card--${toolCall.status}`">
    <div class="tool-header">
      <el-icon :size="16">
        <component :is="statusIcon" />
      </el-icon>
      <span class="tool-name">{{ toolCall.name }}</span>
      <el-tag :type="statusTagType" size="small" effect="light" round>
        {{ toolCall.status }}
      </el-tag>
    </div>
    <div v-if="showArgs" class="tool-args">
      <pre>{{ formatArgs(toolCall.args) }}</pre>
    </div>
    <div v-if="toolCall.result" class="tool-result">
      <pre>{{ toolCall.result.slice(0, 500) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ToolCallInfo } from "../types"

const props = defineProps<{
  toolCall: ToolCallInfo
}>()

const statusIcon = computed(() => {
  switch (props.toolCall.status) {
    case "proposed": return "QuestionFilled"
    case "running": return "Loading"
    case "completed": return "CircleCheck"
    case "failed": return "CircleClose"
    default: return "InfoFilled"
  }
})

const statusTagType = computed(() => {
  switch (props.toolCall.status) {
    case "proposed": return "warning"
    case "running": return ""
    case "completed": return "success"
    case "failed": return "danger"
    default: return "info"
  }
})

const showArgs = computed(() => {
  return Object.keys(props.toolCall.args).length > 0
})

const formatArgs = (args: Record<string, unknown>): string => {
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
}
</script>

<style scoped>
.tool-call-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  background: white;
}

.tool-card--running {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.02);
}

.tool-card--completed {
  border-color: #67c23a;
}

.tool-card--failed {
  border-color: #f56c6c;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-name {
  font-weight: 600;
  font-family: monospace;
}

.tool-args, .tool-result {
  margin-top: 8px;
}

.tool-args pre, .tool-result pre {
  background: #f5f7fa;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.tool-result pre {
  background: #f0f9eb;
}
</style>
