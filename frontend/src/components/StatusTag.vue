<template>
  <el-tag :type="tagType" effect="light" round>
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  status: string
}>()

const tagType = computed(() => {
  switch (props.status) {
    case "pending": return "warning"
    case "running": return ""
    case "completed": return "success"
    case "failed": return "danger"
    case "skipped": return "info"
    default: return "info"
  }
})

const label = computed(() => {
  return props.status.charAt(0).toUpperCase() + props.status.slice(1)
})
</script>
