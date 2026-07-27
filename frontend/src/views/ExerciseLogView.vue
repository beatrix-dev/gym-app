<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listExercises } from '@/api/exercises'
import { deleteSet, finishSession, listSessions, logSet, startSession } from '@/api/workoutSessions'
import type { Exercise, WorkoutSession } from '@/types'

const exercises = ref<Exercise[]>([])
const currentSession = ref<WorkoutSession | null>(null)
const isLoading = ref(true)
const isStartingSession = ref(false)
const error = ref('')

const exerciseId = ref<number | null>(null)
const weightKg = ref<number | null>(null)
const reps = ref<number | null>(null)
const rpe = ref<number | null>(null)
const isWarmup = ref(false)
const isLoggingSet = ref(false)

const exerciseName = (id: number) => exercises.value.find((e) => e.id === id)?.name ?? `#${id}`

const sortedSets = computed(() => currentSession.value?.sets ?? [])

async function loadInitialData() {
  isLoading.value = true
  error.value = ''
  try {
    exercises.value = await listExercises()
    const sessions = await listSessions()
    currentSession.value = sessions.find((s) => s.ended_at === null) ?? null
  } catch {
    error.value = 'Failed to load data. Is the backend running?'
  } finally {
    isLoading.value = false
  }
}

async function handleStartSession() {
  isStartingSession.value = true
  error.value = ''
  try {
    currentSession.value = await startSession()
  } catch {
    error.value = 'Failed to start a workout session.'
  } finally {
    isStartingSession.value = false
  }
}

async function handleLogSet() {
  if (!currentSession.value || exerciseId.value === null || weightKg.value === null || reps.value === null) {
    return
  }
  isLoggingSet.value = true
  error.value = ''
  try {
    const set = await logSet(currentSession.value.id, {
      exercise_id: exerciseId.value,
      weight_kg: weightKg.value,
      reps: reps.value,
      rpe: rpe.value,
      is_warmup: isWarmup.value,
    })
    currentSession.value.sets.push(set)
    weightKg.value = null
    reps.value = null
    rpe.value = null
    isWarmup.value = false
  } catch {
    error.value = 'Failed to log set.'
  } finally {
    isLoggingSet.value = false
  }
}

async function handleDeleteSet(setId: number) {
  if (!currentSession.value) return
  try {
    await deleteSet(currentSession.value.id, setId)
    currentSession.value.sets = currentSession.value.sets.filter((s) => s.id !== setId)
  } catch {
    error.value = 'Failed to delete set.'
  }
}

async function handleFinishSession() {
  if (!currentSession.value) return
  try {
    currentSession.value = await finishSession(currentSession.value.id)
    currentSession.value = null
  } catch {
    error.value = 'Failed to finish session.'
  }
}

onMounted(loadInitialData)
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Exercise Log</h1>

    <p v-if="error" class="mb-4 text-sm text-error">{{ error }}</p>

    <div v-if="isLoading" class="text-sm text-slate-500">Loading…</div>

    <div v-else-if="!currentSession" class="flex flex-col items-start gap-3">
      <p class="text-sm text-slate-600">No workout in progress.</p>
      <button
        :disabled="isStartingSession"
        class="rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
        @click="handleStartSession"
      >
        {{ isStartingSession ? 'Starting…' : 'Start workout' }}
      </button>
    </div>

    <div v-else class="flex flex-col gap-6">
      <form
        class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        @submit.prevent="handleLogSet"
      >
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Exercise
          <select
            v-model="exerciseId"
            required
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
          >
            <option :value="null" disabled>Select an exercise</option>
            <option v-for="ex in exercises" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
          </select>
        </label>

        <div class="grid grid-cols-3 gap-3">
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Weight (kg)
            <input
              v-model.number="weightKg"
              type="number"
              step="0.5"
              min="0"
              required
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            />
          </label>
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Reps
            <input
              v-model.number="reps"
              type="number"
              min="1"
              required
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            />
          </label>
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            RPE
            <input
              v-model.number="rpe"
              type="number"
              step="0.5"
              min="1"
              max="10"
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            />
          </label>
        </div>

        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="isWarmup" type="checkbox" class="rounded border-slate-300 text-accent-600 focus:ring-accent-600" />
          Warmup set
        </label>

        <button
          type="submit"
          :disabled="isLoggingSet"
          class="rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
        >
          {{ isLoggingSet ? 'Logging…' : 'Log set' }}
        </button>
      </form>

      <div>
        <h2 class="mb-2 text-sm font-semibold text-slate-900">This session</h2>
        <p v-if="sortedSets.length === 0" class="text-sm text-slate-500">No sets logged yet.</p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="set in sortedSets"
            :key="set.id"
            class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              <span class="font-medium">{{ exerciseName(set.exercise_id) }}</span>
              — {{ set.weight_kg }}kg × {{ set.reps }}
              <span v-if="set.rpe !== null"> @ RPE {{ set.rpe }}</span>
              <span v-if="set.is_warmup" class="ml-1 text-xs text-slate-400">(warmup)</span>
            </span>
            <button class="text-xs text-error hover:opacity-80" @click="handleDeleteSet(set.id)">
              Remove
            </button>
          </li>
        </ul>
      </div>

      <button
        class="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        @click="handleFinishSession"
      >
        Finish workout
      </button>
    </div>
  </div>
</template>
