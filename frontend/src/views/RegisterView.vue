<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const isSubmitting = ref(false)

const authStore = useAuthStore()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  isSubmitting.value = true
  try {
    await authStore.register(email.value, password.value, displayName.value || undefined)
    router.push('/log')
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 400) {
      error.value = 'Email already registered.'
    } else {
      error.value = 'Something went wrong. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Create an account</h1>
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Display name
        <input
          v-model="displayName"
          type="text"
          autocomplete="name"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Email
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Password
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
        />
      </label>
      <p v-if="error" class="text-sm text-error">{{ error }}</p>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
      >
        {{ isSubmitting ? 'Creating account…' : 'Register' }}
      </button>
    </form>
    <p class="mt-4 text-sm text-slate-600">
      Already have an account?
      <RouterLink to="/login" class="font-medium text-accent-600 hover:text-accent-700">
        Log in
      </RouterLink>
    </p>
  </div>
</template>
