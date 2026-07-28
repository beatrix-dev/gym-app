import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/log' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/log',
      name: 'exercise-log',
      component: () => import('@/views/ExerciseLogView.vue'),
    },
    {
      path: '/records',
      name: 'personal-records',
      component: () => import('@/views/PersonalRecordsView.vue'),
    },
    {
      path: '/planner',
      name: 'planner',
      component: () => import('@/views/PlannerView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (!to.meta.public && !authStore.isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.public && authStore.isAuthenticated()) {
    return { name: 'exercise-log' }
  }
})

export default router
