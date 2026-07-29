<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-brand">
        <el-icon :size="24"><Monitor /></el-icon>
        <span class="brand-name">opensheeta</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        router
        class="header-menu"
      >
        <el-menu-item index="/">Dashboard</el-menu-item>
        <el-menu-item index="/tasks">Tasks</el-menu-item>
        <el-menu-item index="/pipelines">Pipelines</el-menu-item>
        <el-menu-item index="/recurring">Recurring</el-menu-item>
        <el-menu-item index="/queue">Queue</el-menu-item>
      </el-menu>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"

const route = useRoute()
const activeMenu = computed(() => route.path)
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
}

.brand-name {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.header-menu {
  border-bottom: none !important;
}

.header-menu .el-menu-item {
  border-radius: 8px;
  margin: 0 4px;
}

.header-menu .el-menu-item.is-active {
  background: var(--brand-primary);
  color: white !important;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  width: 100%;
}
</style>
