<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Exercise, MuscleGroup } from '@/types'

const props = defineProps<{
  modelValue: number | null
  exercises: Exercise[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
]

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  full_body: 'Full Body',
}

const searchQuery = ref('')
const activeMuscleGroup = ref<MuscleGroup | 'all'>('all')
const isOpen = ref(false)

const selectedExercise = computed(
  () => props.exercises.find((e) => e.id === props.modelValue) ?? null,
)

const filteredExercises = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return props.exercises.filter((ex) => {
    const matchesQuery = query === '' || ex.name.toLowerCase().includes(query)
    const matchesGroup = activeMuscleGroup.value === 'all' || ex.muscle_group === activeMuscleGroup.value
    return matchesQuery && matchesGroup
  })
})

function chipLabel(group: MuscleGroup | 'all') {
  return group === 'all' ? 'All' : MUSCLE_GROUP_LABELS[group]
}

function selectExercise(exercise: Exercise) {
  emit('update:modelValue', exercise.id)
  searchQuery.value = ''
  isOpen.value = false
}

function openBrowse() {
  isOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-1 text-sm font-medium text-slate-700">
    <span>Exercise</span>

    <div v-if="selectedExercise && !isOpen" class="flex items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm">
      <span class="font-normal text-slate-900">{{ selectedExercise.name }}</span>
      <button type="button" class="text-xs font-medium text-accent-600 hover:underline" @click="openBrowse">
        Change
      </button>
    </div>

    <div v-else class="flex flex-col gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search exercises…"
        class="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
      />

      <div class="flex flex-wrap gap-1">
        <button
          type="button"
          class="rounded-full border px-2 py-1 text-xs font-medium"
          :class="
            activeMuscleGroup === 'all'
              ? 'border-accent-600 bg-accent-50 text-accent-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          "
          @click="activeMuscleGroup = 'all'"
        >
          {{ chipLabel('all') }}
        </button>
        <button
          v-for="group in MUSCLE_GROUPS"
          :key="group"
          type="button"
          class="rounded-full border px-2 py-1 text-xs font-medium"
          :class="
            activeMuscleGroup === group
              ? 'border-accent-600 bg-accent-50 text-accent-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          "
          @click="activeMuscleGroup = group"
        >
          {{ chipLabel(group) }}
        </button>
      </div>

      <ul class="max-h-56 overflow-y-auto rounded-md border border-slate-200">
        <li v-if="filteredExercises.length === 0" class="px-3 py-2 text-sm font-normal text-slate-500">
          No exercises match.
        </li>
        <li v-for="ex in filteredExercises" :key="ex.id">
          <button
            type="button"
            class="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent-50"
            @click="selectExercise(ex)"
          >
            <span class="font-normal text-slate-900">{{ ex.name }}</span>
            <span v-if="ex.muscle_group" class="text-xs text-slate-500">
              {{ MUSCLE_GROUP_LABELS[ex.muscle_group] }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
