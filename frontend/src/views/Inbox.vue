<template>
  <div class="inbox-page">
    <el-card class="inbox-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span>Inbox</span>
            <el-badge :value="inboxStore.pendingCount" :hidden="inboxStore.pendingCount === 0" type="primary">
              <el-tag effect="light" round>Pending</el-tag>
            </el-badge>
          </div>
          <el-button text @click="inboxStore.fetchInbox()">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>

      <div v-if="inboxStore.items.length === 0" class="empty-inbox">
        <el-icon :size="48"><Message /></el-icon>
        <p>No inbox items</p>
      </div>

      <div v-for="item in inboxStore.items" :key="item.id" class="inbox-item" :class="`item--${item.kind}`">
        <div class="item-header">
          <el-tag :type="kindTagType(item.kind)" size="small" effect="light" round>
            {{ item.kind }}
          </el-tag>
          <span class="item-title">{{ item.title }}</span>
          <el-tag v-if="item.state === 'resolved'" type="info" size="small" effect="light" round>
            Resolved
          </el-tag>
        </div>

        <div v-if="item.body" class="item-body">
          <pre>{{ item.body.slice(0, 500) }}</pre>
        </div>

        <div class="item-meta">
          <span>{{ new Date(item.created_at).toLocaleString() }}</span>
          <span v-if="item.session_id">Session: {{ item.session_id.slice(0, 12) }}...</span>
        </div>

        <div v-if="item.state === 'pending'" class="item-actions">
          <template v-if="item.kind === 'approval'">
            <el-button type="danger" size="small" @click="handleResolve(item.id, 'deny')">Deny</el-button>
            <el-button type="primary" size="small" @click="handleResolve(item.id, 'once')">Allow</el-button>
          </template>
          <template v-else-if="item.kind === 'question'">
            <el-input v-model="answerTexts[item.id]" placeholder="Your answer..." size="small" style="flex: 1" />
            <el-button type="primary" size="small" @click="handleResolve(item.id, answerTexts[item.id] || '')">Answer</el-button>
          </template>
          <template v-else-if="item.kind === 'directory'">
            <el-button type="danger" size="small" @click="handleResolve(item.id, JSON.stringify({ granted: false }))">Deny</el-button>
            <el-button type="primary" size="small" @click="handleResolve(item.id, JSON.stringify({ granted: true }))">Grant</el-button>
          </template>
          <template v-else-if="item.kind === 'plan'">
            <el-button type="danger" size="small" @click="handleResolve(item.id, JSON.stringify({ approved: false }))">Reject</el-button>
            <el-button type="primary" size="small" @click="handleResolve(item.id, JSON.stringify({ approved: true }))">Approve</el-button>
          </template>
          <template v-else>
            <el-button type="primary" size="small" @click="handleResolve(item.id, 'acknowledged')">Acknowledge</el-button>
          </template>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { useInboxStore } from "../stores/inbox"
import type { InboxKind } from "../types"

const inboxStore = useInboxStore()
const answerTexts = reactive<Record<string, string>>({})

const kindTagType = (kind: InboxKind) => {
  switch (kind) {
    case "approval": return "warning"
    case "question": return ""
    case "notification": return "info"
    case "directory": return "danger"
    case "plan": return "success"
    default: return "info"
  }
}

const handleResolve = async (id: string, resolution: string) => {
  try {
    await inboxStore.resolve(id, resolution)
    ElMessage.success("Resolved")
  } catch {
    ElMessage.error("Failed to resolve")
  }
}

onMounted(() => {
  inboxStore.fetchInbox()
})
</script>

<style scoped>
.inbox-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.inbox-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.empty-inbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #909399;
  gap: 12px;
}

.inbox-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  margin-bottom: 12px;
}

.item--approval { border-left: 3px solid #e6a23c; }
.item--question { border-left: 3px solid #409eff; }
.item--notification { border-left: 3px solid #909399; }
.item--directory { border-left: 3px solid #f56c6c; }
.item--plan { border-left: 3px solid #67c23a; }

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.item-title {
  font-weight: 600;
  flex: 1;
}

.item-body pre {
  background: #f5f7fa;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.item-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}
</style>
