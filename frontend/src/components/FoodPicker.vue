<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FoodCategory, FoodItem } from '@/types'

const props = defineProps<{
  modelValue: number | null
  foodItems: FoodItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const FOOD_CATEGORIES: FoodCategory[] = ['protein', 'dairy', 'grains', 'produce', 'fats_oils', 'other']

const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'Protein',
  dairy: 'Dairy',
  grains: 'Grains & Carbs',
  produce: 'Fruits & Veg',
  fats_oils: 'Fats & Oils',
  other: 'Other',
}

const searchQuery = ref('')
const activeCategory = ref<FoodCategory | 'all'>('all')
const isOpen = ref(false)

const selectedFood = computed(() => props.foodItems.find((f) => f.id === props.modelValue) ?? null)

const filteredFoodItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return props.foodItems.filter((food) => {
    const matchesQuery = query === '' || food.name.toLowerCase().includes(query)
    const matchesCategory = activeCategory.value === 'all' || food.category === activeCategory.value
    return matchesQuery && matchesCategory
  })
})

function chipLabel(category: FoodCategory | 'all') {
  return category === 'all' ? 'All' : FOOD_CATEGORY_LABELS[category]
}

function selectFood(food: FoodItem) {
  emit('update:modelValue', food.id)
  searchQuery.value = ''
  isOpen.value = false
}

function openBrowse() {
  isOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-1 text-sm font-medium text-slate-700">
    <span>Food</span>

    <div
      v-if="selectedFood && !isOpen"
      class="flex items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm"
    >
      <span class="font-normal text-slate-900">{{ selectedFood.name }}</span>
      <button type="button" class="text-xs font-medium text-accent-600 hover:underline" @click="openBrowse">
        Change
      </button>
    </div>

    <div v-else class="flex flex-col gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search foods…"
        class="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
      />

      <div class="flex flex-wrap gap-1">
        <button
          type="button"
          class="rounded-full border px-2 py-1 text-xs font-medium"
          :class="
            activeCategory === 'all'
              ? 'border-accent-600 bg-accent-50 text-accent-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          "
          @click="activeCategory = 'all'"
        >
          {{ chipLabel('all') }}
        </button>
        <button
          v-for="category in FOOD_CATEGORIES"
          :key="category"
          type="button"
          class="rounded-full border px-2 py-1 text-xs font-medium"
          :class="
            activeCategory === category
              ? 'border-accent-600 bg-accent-50 text-accent-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          "
          @click="activeCategory = category"
        >
          {{ chipLabel(category) }}
        </button>
      </div>

      <ul class="max-h-56 overflow-y-auto rounded-md border border-slate-200">
        <li v-if="filteredFoodItems.length === 0" class="px-3 py-2 text-sm font-normal text-slate-500">
          No foods match.
        </li>
        <li v-for="food in filteredFoodItems" :key="food.id">
          <button
            type="button"
            class="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent-50"
            @click="selectFood(food)"
          >
            <span class="font-normal text-slate-900">{{ food.name }}</span>
            <span class="text-xs text-slate-500">
              {{ food.calories_per_100g ?? '?' }} kcal per 100g
              <span v-if="food.category"> · {{ FOOD_CATEGORY_LABELS[food.category] }}</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
