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
      path: "/sessions",
      name: "Sessions",
      component: () => import("../views/Sessions.vue"),
    },
    {
      path: "/sessions/:id",
      name: "SessionChat",
      component: () => import("../views/SessionChat.vue"),
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
      path: "/automations",
      name: "Automations",
      component: () => import("../views/Automations.vue"),
    },
    {
      path: "/queue",
      name: "Queue",
      component: () => import("../views/Queue.vue"),
    },
    {
      path: "/inbox",
      name: "Inbox",
      component: () => import("../views/Inbox.vue"),
    },
    {
      path: "/agents",
      name: "Agents",
      component: () => import("../views/Agents.vue"),
    },
  ],
})

export default router
