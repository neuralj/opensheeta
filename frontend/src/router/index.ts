import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Dashboard",
      component: () => import("../views/Dashboard.vue"),
    },
    {
      path: "/tasks",
      name: "Tasks",
      component: () => import("../views/Tasks.vue"),
    },
    {
      path: "/tasks/:id",
      name: "TaskDetail",
      component: () => import("../views/TaskDetail.vue"),
    },
    {
      path: "/pipelines",
      name: "Pipelines",
      component: () => import("../views/Pipelines.vue"),
    },
    {
      path: "/recurring",
      name: "Recurring",
      component: () => import("../views/Recurring.vue"),
    },
    {
      path: "/queue",
      name: "Queue",
      component: () => import("../views/Queue.vue"),
    },
  ],
})

export default router
