<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()

function handleSignIn() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
  authStore.signIn(redirect)
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Log in</h1>
    <p v-if="authStore.accessDenied" class="mb-4 text-sm text-error">
      This Google account isn't allowed to use this app.
    </p>
    <button
      type="button"
      class="w-full rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700"
      @click="handleSignIn"
    >
      Sign in with Google
    </button>
  </div>
</template>
