<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const failed = ref(false)

onMounted(async () => {
  try {
    const redirect = await authStore.completeSignIn()
    await authStore.loadCurrentUser()
    router.replace(redirect)
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <div class="mx-auto max-w-sm">
    <template v-if="failed">
      <p class="mb-4 text-sm text-error">Sign-in failed.</p>
      <RouterLink to="/login" class="text-sm font-medium text-accent-600 hover:text-accent-700">
        Back to log in
      </RouterLink>
    </template>
    <p v-else class="text-sm text-slate-600">Signing you in…</p>
  </div>
</template>
