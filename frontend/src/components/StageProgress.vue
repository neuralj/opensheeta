<template>
  <div class="stage-progress">
    <div
      v-for="(stage, index) in stages"
      :key="stage.id"
      class="stage-node"
    >
      <div class="stage-circle" :class="`stage--${stage.status}`">
        <el-icon v-if="stage.status === 'completed'"><Check /></el-icon>
        <el-icon v-else-if="stage.status === 'failed'"><Close /></el-icon>
        <el-icon v-else-if="stage.status === 'running'" class="spinning"><Loading /></el-icon>
        <el-icon v-else-if="stage.status === 'skipped'"><Minus /></el-icon>
        <span v-else>{{ index + 1 }}</span>
      </div>
      <div class="stage-label">{{ stage.label }}</div>
      <div v-if="index < stages.length - 1" class="stage-line" :class="{ 'line--done': stage.status === 'completed' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PipelineStage } from "../types"

defineProps<{
  stages: PipelineStage[]
}>()
</script>

<style scoped>
.stage-progress {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 16px 0;
}

.stage-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
}

.stage-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid #dcdfe6;
  background: white;
  color: #909399;
  z-index: 1;
}

.stage--pending { border-color: #dcdfe6; color: #909399; }
.stage--running { border-color: #409eff; color: #409eff; background: rgba(64, 158, 255, 0.1); }
.stage--completed { border-color: #67c23a; color: #67c23a; background: rgba(103, 194, 58, 0.1); }
.stage--failed { border-color: #f56c6c; color: #f56c6c; background: rgba(245, 108, 108, 0.1); }
.stage--skipped { border-color: #dcdfe6; color: #c0c4cc; }

.stage-label {
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
  text-align: center;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-line {
  position: absolute;
  top: 18px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #dcdfe6;
  z-index: 0;
}

.line--done {
  background: #67c23a;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
