<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listExercises } from '@/api/exercises'
import {
  addPlanExercise,
  createPlan,
  createPlanDay,
  deletePlan,
  deletePlanDay,
  deletePlanExercise,
  getDayRecommendations,
  listPlans,
} from '@/api/workoutPlans'
import type { Exercise, PlanExerciseRecommendation, WorkoutPlan, WorkoutPlanExercise } from '@/types'

const exercises = ref<Exercise[]>([])
const plans = ref<WorkoutPlan[]>([])
const isLoading = ref(true)
const error = ref('')

const selectedPlanId = ref<number | null>(null)
const selectedDayId = ref<number | null>(null)
const recommendations = ref<Map<number, PlanExerciseRecommendation>>(new Map())
const isLoadingRecommendations = ref(false)

const newPlanName = ref('')
const isCreatingPlan = ref(false)

const newDayLabel = ref('')
const isCreatingDay = ref(false)

const newExerciseId = ref<number | null>(null)
const newTargetSets = ref<number | null>(null)
const newTargetRepsMin = ref<number | null>(null)
const newTargetRepsMax = ref<number | null>(null)
const isAddingExercise = ref(false)

const selectedPlan = computed(() => plans.value.find((p) => p.id === selectedPlanId.value) ?? null)
const selectedDay = computed(
  () => selectedPlan.value?.days.find((d) => d.id === selectedDayId.value) ?? null,
)

function formatRepRange(pe: WorkoutPlanExercise) {
  if (pe.target_reps_min !== null && pe.target_reps_max !== null) {
    return `${pe.target_reps_min}–${pe.target_reps_max} reps`
  }
  if (pe.target_reps_max !== null) return `up to ${pe.target_reps_max} reps`
  if (pe.target_reps_min !== null) return `${pe.target_reps_min}+ reps`
  return 'reps not set'
}

function recommendationFor(planExerciseId: number) {
  return recommendations.value.get(planExerciseId)
}

async function loadInitialData() {
  isLoading.value = true
  error.value = ''
  try {
    ;[exercises.value, plans.value] = await Promise.all([listExercises(), listPlans()])
  } catch {
    error.value = 'Failed to load planner data. Is the backend running?'
  } finally {
    isLoading.value = false
  }
}

async function loadRecommendations() {
  if (!selectedPlan.value || !selectedDay.value) return
  isLoadingRecommendations.value = true
  try {
    const recs = await getDayRecommendations(selectedPlan.value.id, selectedDay.value.id)
    recommendations.value = new Map(recs.map((r) => [r.plan_exercise_id, r]))
  } catch {
    error.value = 'Failed to load recommendations.'
  } finally {
    isLoadingRecommendations.value = false
  }
}

function selectPlan(planId: number) {
  selectedPlanId.value = planId
  selectedDayId.value = null
  recommendations.value = new Map()
}

function selectDay(dayId: number) {
  selectedDayId.value = dayId
  loadRecommendations()
}

async function handleCreatePlan() {
  if (!newPlanName.value.trim()) return
  isCreatingPlan.value = true
  error.value = ''
  try {
    const plan = await createPlan({ name: newPlanName.value.trim() })
    plans.value.unshift(plan)
    newPlanName.value = ''
    selectPlan(plan.id)
  } catch {
    error.value = 'Failed to create plan.'
  } finally {
    isCreatingPlan.value = false
  }
}

async function handleDeletePlan(planId: number) {
  try {
    await deletePlan(planId)
    plans.value = plans.value.filter((p) => p.id !== planId)
    if (selectedPlanId.value === planId) {
      selectedPlanId.value = null
      selectedDayId.value = null
    }
  } catch {
    error.value = 'Failed to delete plan.'
  }
}

async function handleCreateDay() {
  if (!selectedPlan.value || !newDayLabel.value.trim()) return
  isCreatingDay.value = true
  error.value = ''
  try {
    const nextOrder = selectedPlan.value.days.length + 1
    const day = await createPlanDay(selectedPlan.value.id, {
      day_order: nextOrder,
      label: newDayLabel.value.trim(),
    })
    selectedPlan.value.days.push(day)
    newDayLabel.value = ''
    selectDay(day.id)
  } catch {
    error.value = 'Failed to create day.'
  } finally {
    isCreatingDay.value = false
  }
}

async function handleDeleteDay(dayId: number) {
  if (!selectedPlan.value) return
  try {
    await deletePlanDay(selectedPlan.value.id, dayId)
    selectedPlan.value.days = selectedPlan.value.days.filter((d) => d.id !== dayId)
    if (selectedDayId.value === dayId) {
      selectedDayId.value = null
      recommendations.value = new Map()
    }
  } catch {
    error.value = 'Failed to delete day.'
  }
}

async function handleAddExercise() {
  if (!selectedPlan.value || !selectedDay.value || newExerciseId.value === null) return
  isAddingExercise.value = true
  error.value = ''
  try {
    const nextOrder = selectedDay.value.plan_exercises.length + 1
    const planExercise = await addPlanExercise(selectedPlan.value.id, selectedDay.value.id, {
      exercise_id: newExerciseId.value,
      exercise_order: nextOrder,
      target_sets: newTargetSets.value,
      target_reps_min: newTargetRepsMin.value,
      target_reps_max: newTargetRepsMax.value,
    })
    selectedDay.value.plan_exercises.push(planExercise)
    newExerciseId.value = null
    newTargetSets.value = null
    newTargetRepsMin.value = null
    newTargetRepsMax.value = null
    await loadRecommendations()
  } catch {
    error.value = 'Failed to add exercise.'
  } finally {
    isAddingExercise.value = false
  }
}

async function handleDeleteExercise(planExerciseId: number) {
  if (!selectedPlan.value || !selectedDay.value) return
  try {
    await deletePlanExercise(selectedPlan.value.id, selectedDay.value.id, planExerciseId)
    selectedDay.value.plan_exercises = selectedDay.value.plan_exercises.filter(
      (pe) => pe.id !== planExerciseId,
    )
    recommendations.value.delete(planExerciseId)
  } catch {
    error.value = 'Failed to delete exercise.'
  }
}

onMounted(loadInitialData)
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Planner</h1>

    <p v-if="error" class="mb-4 text-sm text-error">{{ error }}</p>
    <div v-if="isLoading" class="text-sm text-slate-500">Loading…</div>

    <div v-else class="flex flex-col gap-8">
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-slate-900">Plans</h2>
        <p v-if="plans.length === 0" class="text-sm text-slate-500">
          No plans yet — create one below.
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="plan in plans"
            :key="plan.id"
            class="flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm shadow-sm"
            :class="
              plan.id === selectedPlanId
                ? 'border-accent-600 bg-accent-50'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            "
            @click="selectPlan(plan.id)"
          >
            <span class="font-medium text-slate-900">{{ plan.name || 'Untitled plan' }}</span>
            <button class="text-xs text-error hover:opacity-80" @click.stop="handleDeletePlan(plan.id)">
              Remove
            </button>
          </li>
        </ul>

        <form class="flex gap-2" @submit.prevent="handleCreatePlan">
          <input
            v-model="newPlanName"
            type="text"
            placeholder="New plan name"
            required
            class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
          />
          <button
            type="submit"
            :disabled="isCreatingPlan"
            class="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {{ isCreatingPlan ? 'Creating…' : 'Add plan' }}
          </button>
        </form>
      </section>

      <section v-if="selectedPlan" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-slate-900">
          Days — {{ selectedPlan.name || 'Untitled plan' }}
        </h2>
        <p v-if="selectedPlan.days.length === 0" class="text-sm text-slate-500">
          No days yet — add one below.
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="day in selectedPlan.days"
            :key="day.id"
            class="flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm shadow-sm"
            :class="
              day.id === selectedDayId
                ? 'border-accent-600 bg-accent-50'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            "
            @click="selectDay(day.id)"
          >
            <span class="font-medium text-slate-900">{{ day.label || `Day ${day.day_order}` }}</span>
            <button class="text-xs text-error hover:opacity-80" @click.stop="handleDeleteDay(day.id)">
              Remove
            </button>
          </li>
        </ul>

        <form class="flex gap-2" @submit.prevent="handleCreateDay">
          <input
            v-model="newDayLabel"
            type="text"
            placeholder="New day label (e.g. Push Day)"
            required
            class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
          />
          <button
            type="submit"
            :disabled="isCreatingDay"
            class="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {{ isCreatingDay ? 'Creating…' : 'Add day' }}
          </button>
        </form>
      </section>

      <section v-if="selectedDay" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-slate-900">
          Exercises — {{ selectedDay.label || `Day ${selectedDay.day_order}` }}
        </h2>
        <p v-if="selectedDay.plan_exercises.length === 0" class="text-sm text-slate-500">
          No exercises yet — add one below.
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="pe in selectedDay.plan_exercises"
            :key="pe.id"
            class="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p class="text-sm font-medium text-slate-900">{{ pe.exercise.name }}</p>
              <p class="text-xs text-slate-500">
                {{ pe.target_sets ?? '?' }} sets × {{ formatRepRange(pe) }}
              </p>
              <p v-if="isLoadingRecommendations" class="mt-1 text-xs text-slate-400">
                Loading suggestion…
              </p>
              <template v-else-if="recommendationFor(pe.id)">
                <p
                  v-if="recommendationFor(pe.id)!.suggested_weight_kg !== null"
                  class="mt-1 inline-block rounded-md bg-accent-50 px-2 py-1 text-sm font-semibold text-accent-700"
                >
                  Suggested {{ recommendationFor(pe.id)!.suggested_weight_kg }}kg
                </p>
                <p class="mt-1 text-xs text-slate-500">{{ recommendationFor(pe.id)!.rationale }}</p>
              </template>
            </div>
            <button class="text-xs text-error hover:opacity-80" @click="handleDeleteExercise(pe.id)">
              Remove
            </button>
          </li>
        </ul>

        <form class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" @submit.prevent="handleAddExercise">
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Exercise
            <select
              v-model="newExerciseId"
              required
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option :value="null" disabled>Select an exercise</option>
              <option v-for="ex in exercises" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
            </select>
          </label>

          <div class="grid grid-cols-3 gap-3">
            <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Sets
              <input
                v-model.number="newTargetSets"
                type="number"
                min="1"
                class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Min reps
              <input
                v-model.number="newTargetRepsMin"
                type="number"
                min="1"
                class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Max reps
              <input
                v-model.number="newTargetRepsMax"
                type="number"
                min="1"
                class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </label>
          </div>

          <button
            type="submit"
            :disabled="isAddingExercise"
            class="self-start rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {{ isAddingExercise ? 'Adding…' : 'Add exercise' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>
