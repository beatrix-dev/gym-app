<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { isWakingUp } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  if (authStore.isAuthenticated()) {
    authStore.loadCurrentUser()
  }
})

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header v-if="authStore.isAuthenticated()" class="border-b border-slate-200 bg-white">
      <nav class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div class="flex gap-4 text-sm font-medium">
          <RouterLink
            to="/log"
            class="text-slate-600 hover:text-slate-900"
            active-class="text-accent-600 hover:text-accent-600"
          >
            Log
          </RouterLink>
          <RouterLink
            to="/planner"
            class="text-slate-600 hover:text-slate-900"
            active-class="text-accent-600 hover:text-accent-600"
          >
            Workout Planner
          </RouterLink>
          <RouterLink
            to="/meals"
            class="text-slate-600 hover:text-slate-900"
            active-class="text-accent-600 hover:text-accent-600"
          >
            Meals
          </RouterLink>
          <RouterLink
            to="/records"
            class="text-slate-600 hover:text-slate-900"
            active-class="text-accent-600 hover:text-accent-600"
          >
            Records
          </RouterLink>
        </div>
        <button class="text-sm text-slate-500 hover:text-slate-700" @click="handleLogout">
          Log out
        </button>
      </nav>
    </header>
    <div v-if="isWakingUp" class="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      Waking up the server…
    </div>
    <main class="mx-auto max-w-3xl px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
