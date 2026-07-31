<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ExercisePicker from '@/components/ExercisePicker.vue'
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
  updatePlanDay,
} from '@/api/workoutPlans'
import type {
  DayOfWeek,
  Exercise,
  MuscleGroup,
  PlanExerciseRecommendation,
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanExercise,
} from '@/types'

const WEEKDAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const SPLIT_PRESETS = [
  'Push',
  'Pull',
  'Legs',
  'Upper',
  'Lower',
  'Full Body',
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Core',
  'Rest Day',
] as const

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
]

const SPLIT_MUSCLE_GROUPS: Record<(typeof SPLIT_PRESETS)[number], MuscleGroup[]> = {
  Push: ['chest', 'shoulders', 'arms'],
  Pull: ['back', 'arms'],
  Legs: ['legs'],
  Upper: ['chest', 'back', 'shoulders', 'arms'],
  Lower: ['legs'],
  'Full Body': ALL_MUSCLE_GROUPS,
  Chest: ['chest'],
  Back: ['back'],
  Shoulders: ['shoulders'],
  Arms: ['arms'],
  Core: ['core'],
  'Rest Day': [],
}

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

const newDayPreset = ref<(typeof SPLIT_PRESETS)[number] | 'Custom' | ''>('')
const newDayCustomLabel = ref('')
const newDayWeekday = ref<DayOfWeek | ''>('')
const isCreatingDay = ref(false)

const newExerciseId = ref<number | null>(null)
const newTargetSets = ref<number | null>(null)
const newTargetRepsMin = ref<number | null>(null)
const newTargetRepsMax = ref<number | null>(null)
const isAddingExercise = ref(false)
const isSetsModalOpen = ref(false)

const selectedPlan = computed(() => plans.value.find((p) => p.id === selectedPlanId.value) ?? null)
const selectedDay = computed(
  () => selectedPlan.value?.days.find((d) => d.id === selectedDayId.value) ?? null,
)

const claimedWeekdays = computed(
  () =>
    new Set(
      (selectedPlan.value?.days ?? [])
        .map((d) => d.day_of_week)
        .filter((d): d is DayOfWeek => d !== null),
    ),
)

function dayForWeekday(wd: DayOfWeek) {
  return selectedPlan.value?.days.find((d) => d.day_of_week === wd) ?? null
}

function claimedWeekdaysExcluding(dayId: number): Set<DayOfWeek> {
  return new Set(
    (selectedPlan.value?.days ?? [])
      .filter((d) => d.id !== dayId)
      .map((d) => d.day_of_week)
      .filter((d): d is DayOfWeek => d !== null),
  )
}

const unscheduledDays = computed(
  () => (selectedPlan.value?.days ?? []).filter((d) => d.day_of_week === null),
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

const recommendedExercises = computed(() => {
  const label = selectedDay.value?.label
  if (!label) return []
  const groups = SPLIT_MUSCLE_GROUPS[label as (typeof SPLIT_PRESETS)[number]]
  if (!groups || groups.length === 0) return []
  const alreadyAdded = new Set(selectedDay.value!.plan_exercises.map((pe) => pe.exercise.id))
  return exercises.value.filter(
    (ex) => ex.muscle_group !== null && groups.includes(ex.muscle_group) && !alreadyAdded.has(ex.id),
  )
})

function pickRecommendedExercise(exerciseId: number) {
  newExerciseId.value = exerciseId
}

function openSetsModal() {
  if (newExerciseId.value === null) return
  isSetsModalOpen.value = true
}

function closeSetsModal() {
  isSetsModalOpen.value = false
  newExerciseId.value = null
  newTargetSets.value = null
  newTargetRepsMin.value = null
  newTargetRepsMax.value = null
}

watch(newExerciseId, (id) => {
  if (id !== null) openSetsModal()
})

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
  const label = newDayPreset.value === 'Custom' ? newDayCustomLabel.value.trim() : newDayPreset.value
  if (!selectedPlan.value || !label) return
  isCreatingDay.value = true
  error.value = ''
  try {
    const nextOrder = selectedPlan.value.days.length + 1
    const day = await createPlanDay(selectedPlan.value.id, {
      day_order: nextOrder,
      label,
      day_of_week: newDayWeekday.value || null,
    })
    selectedPlan.value.days.push(day)
    newDayPreset.value = ''
    newDayCustomLabel.value = ''
    newDayWeekday.value = ''
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

async function handleChangeWeekday(day: WorkoutPlanDay, value: DayOfWeek | '') {
  if (!selectedPlan.value) return
  const day_of_week = value === '' ? null : value
  if (day_of_week === day.day_of_week) return
  try {
    const updated = await updatePlanDay(selectedPlan.value.id, day.id, { day_of_week })
    day.day_of_week = updated.day_of_week
  } catch {
    error.value = 'Failed to reschedule day.'
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
    closeSetsModal()
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

        <template v-else>
          <div class="flex gap-2 overflow-x-auto pb-2">
            <div v-for="wd in WEEKDAYS" :key="wd" class="flex w-32 flex-shrink-0 flex-col gap-1">
              <p class="text-xs font-semibold uppercase text-slate-500">{{ WEEKDAY_LABELS[wd] }}</p>
              <div
                v-if="dayForWeekday(wd)"
                :data-day-id="dayForWeekday(wd)!.id"
                class="flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2 text-sm shadow-sm"
                :class="
                  dayForWeekday(wd)!.id === selectedDayId
                    ? 'border-accent-600 bg-accent-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                "
                @click="selectDay(dayForWeekday(wd)!.id)"
              >
                <div class="flex items-start justify-between gap-1">
                  <span class="font-medium text-slate-900">
                    {{ dayForWeekday(wd)!.label || `Day ${dayForWeekday(wd)!.day_order}` }}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove day"
                    class="shrink-0 text-xs font-medium text-error hover:opacity-80"
                    @click.stop="handleDeleteDay(dayForWeekday(wd)!.id)"
                  >
                    ×
                  </button>
                </div>
                <span class="text-xs text-slate-500">
                  {{ dayForWeekday(wd)!.plan_exercises.length }} exercises
                </span>
                <select
                  :value="dayForWeekday(wd)!.day_of_week ?? ''"
                  aria-label="Change weekday"
                  class="w-full rounded-md border border-slate-300 px-1 py-1 text-xs focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
                  @click.stop
                  @change="
                    handleChangeWeekday(
                      dayForWeekday(wd)!,
                      ($event.target as HTMLSelectElement).value as DayOfWeek | '',
                    )
                  "
                >
                  <option value="">Unscheduled</option>
                  <option
                    v-for="opt in WEEKDAYS"
                    :key="opt"
                    :value="opt"
                    :disabled="claimedWeekdaysExcluding(dayForWeekday(wd)!.id).has(opt)"
                  >
                    {{ WEEKDAY_LABELS[opt] }}
                  </option>
                </select>
              </div>
              <p
                v-else
                class="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400"
              >
                —
              </p>
            </div>
          </div>

          <div v-if="unscheduledDays.length > 0" class="flex flex-col gap-2">
            <h3 class="text-xs font-semibold uppercase text-slate-500">Unscheduled</h3>
            <ul class="flex flex-col gap-2">
              <li
                v-for="day in unscheduledDays"
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
                <div class="flex items-center gap-2" @click.stop>
                  <select
                    :value="day.day_of_week ?? ''"
                    aria-label="Schedule day"
                    class="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
                    @change="
                      handleChangeWeekday(day, ($event.target as HTMLSelectElement).value as DayOfWeek | '')
                    "
                  >
                    <option value="">Unscheduled</option>
                    <option
                      v-for="wd in WEEKDAYS"
                      :key="wd"
                      :value="wd"
                      :disabled="claimedWeekdaysExcluding(day.id).has(wd)"
                    >
                      {{ WEEKDAY_LABELS[wd] }}
                    </option>
                  </select>
                  <button class="text-xs text-error hover:opacity-80" @click="handleDeleteDay(day.id)">
                    Remove
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </template>

        <form
          class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
          @submit.prevent="handleCreateDay"
        >
          <label class="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            Split
            <select
              v-model="newDayPreset"
              required
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="" disabled>Choose a split</option>
              <option v-for="preset in SPLIT_PRESETS" :key="preset" :value="preset">{{ preset }}</option>
              <option value="Custom">Custom…</option>
            </select>
          </label>
          <label
            v-if="newDayPreset === 'Custom'"
            class="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700"
          >
            Custom label
            <input
              v-model="newDayCustomLabel"
              type="text"
              required
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            />
          </label>
          <label class="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            Weekday
            <select
              v-model="newDayWeekday"
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="">Unscheduled</option>
              <option v-for="wd in WEEKDAYS" :key="wd" :value="wd" :disabled="claimedWeekdays.has(wd)">
                {{ WEEKDAY_LABELS[wd] }}{{ claimedWeekdays.has(wd) ? ' (scheduled)' : '' }}
              </option>
            </select>
          </label>
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

        <div v-if="recommendedExercises.length > 0" class="flex flex-col gap-2">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recommended for {{ selectedDay.label }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="ex in recommendedExercises"
              :key="ex.id"
              type="button"
              class="rounded-full border border-accent-600 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700 hover:bg-accent-100"
              @click="pickRecommendedExercise(ex.id)"
            >
              + {{ ex.name }}
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ExercisePicker v-model="newExerciseId" :exercises="exercises" />
        </div>
      </section>

      <div
        v-if="isSetsModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sets-modal-title"
        @keydown.esc="closeSetsModal"
        @click.self="closeSetsModal"
      >
        <form
          class="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-5 shadow-lg"
          @submit.prevent="handleAddExercise"
        >
          <h2 id="sets-modal-title" class="text-sm font-semibold text-slate-900">
            {{ exercises.find((e) => e.id === newExerciseId)?.name }}
          </h2>

          <div class="grid grid-cols-3 gap-3">
            <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Sets
              <input
                v-model.number="newTargetSets"
                type="number"
                min="1"
                autofocus
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

          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              @click="closeSetsModal"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isAddingExercise"
              class="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
            >
              {{ isAddingExercise ? 'Adding…' : 'Add exercise' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
