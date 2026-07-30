<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-brand">
        <el-icon :size="24"><Monitor /></el-icon>
        <span class="brand-name">opensheeta</span>
        <ConnectionBadge :connected="healthStore.wsConnected" class="header-connection" />
      </div>
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        router
        class="header-menu"
      >
        <el-menu-item index="/">Dashboard</el-menu-item>
        <el-menu-item index="/sessions">Sessions</el-menu-item>
        <el-menu-item index="/tasks">Tasks</el-menu-item>
        <el-menu-item index="/pipelines">Pipelines</el-menu-item>
        <el-menu-item index="/recurring">Recurring</el-menu-item>
        <el-menu-item index="/automations">Automations</el-menu-item>
        <el-menu-item index="/queue">Queue</el-menu-item>
        <el-menu-item index="/inbox">
          Inbox
          <el-badge v-if="inboxStore.pendingCount > 0" :value="inboxStore.pendingCount" type="primary" class="inbox-badge">
          </el-badge>
        </el-menu-item>
        <el-menu-item index="/agents">Agents</el-menu-item>
      </el-menu>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useHealthStore } from "./stores/health"
import { useInboxStore } from "./stores/inbox"
import ConnectionBadge from "./components/ConnectionBadge.vue"

const route = useRoute()
const healthStore = useHealthStore()
const inboxStore = useInboxStore()

const activeMenu = computed(() => route.path)

onMounted(() => {
  healthStore.fetchHealth()
  inboxStore.fetchInbox()
})
</script>

<style>
:root {
  --brand-primary: #409eff;
  --brand-success: #67c23a;
  --brand-warning: #e6a23c;
  --brand-danger: #f56c6c;
  --bg-page: #f5f7fa;
  --bg-card: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--bg-page);
}

.app-container {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px !important;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--brand-primary);
  flex-shrink: 0;
}

.brand-name {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.header-connection {
  margin-left: 4px;
}

.header-menu {
  border-bottom: none !important;
}

.header-menu .el-menu-item {
  border-radius: 8px;
  margin: 0 2px;
  position: relative;
}

.header-menu .el-menu-item.is-active {
  background: var(--brand-primary);
  color: white !important;
}

.inbox-badge {
  margin-left: 4px;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  width: 100%;
}
</style>
