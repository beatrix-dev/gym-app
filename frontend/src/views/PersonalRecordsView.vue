<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listExercises, listPersonalRecords } from '@/api/exercises'
import type { Exercise, PersonalRecord } from '@/types'

const records = ref<PersonalRecord[]>([])
const exercises = ref<Exercise[]>([])
const isLoading = ref(true)
const error = ref('')

const exerciseName = (id: number) => exercises.value.find((e) => e.id === id)?.name ?? `#${id}`

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(async () => {
  try {
    ;[exercises.value, records.value] = await Promise.all([listExercises(), listPersonalRecords()])
  } catch {
    error.value = 'Failed to load personal records.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Personal Records</h1>

    <p v-if="error" class="mb-4 text-sm text-error">{{ error }}</p>
    <div v-if="isLoading" class="text-sm text-slate-500">Loading…</div>
    <p v-else-if="records.length === 0" class="text-sm text-slate-500">
      No personal records yet — log some sets to see your PRs here.
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="record in records"
        :key="record.exercise_id"
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
      >
        <div>
          <p class="text-sm font-medium text-slate-900">{{ exerciseName(record.exercise_id) }}</p>
          <p class="text-xs text-slate-500">
            {{ record.weight_kg }}kg × {{ record.reps }}
            <span v-if="record.rpe !== null"> @ RPE {{ record.rpe }}</span>
            — {{ formatDate(record.achieved_at) }}
          </p>
        </div>
        <span class="rounded-md bg-accent-50 px-2 py-1 text-sm font-semibold text-accent-700">
          e1RM {{ record.estimated_1rm }}kg
        </span>
      </li>
    </ul>
  </div>
</template>
