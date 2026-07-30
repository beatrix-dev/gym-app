<script setup lang="ts">
import { ref } from 'vue'
import FoodPicker from '@/components/FoodPicker.vue'
import type { FoodCategory, FoodItem, FoodItemCreate, MealType } from '@/types'

const props = defineProps<{
  foodItems: FoodItem[]
  isSubmitting: boolean
  submitLabel: string
  createFood: (payload: FoodItemCreate) => Promise<FoodItem>
}>()

const emit = defineEmits<{
  submit: [{ foodItemId: number; mealType: MealType | null; quantityGrams: number }]
}>()

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const FOOD_CATEGORIES: FoodCategory[] = ['protein', 'dairy', 'grains', 'produce', 'fats_oils', 'other']

const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'Protein',
  dairy: 'Dairy',
  grains: 'Grains & Carbs',
  produce: 'Fruits & Veg',
  fats_oils: 'Fats & Oils',
  other: 'Other',
}

const foodItemId = ref<number | null>(null)
const mealType = ref<MealType | null>(null)
const quantityGrams = ref<number | null>(null)

const showAddFood = ref(false)
const newFoodName = ref('')
const newFoodCategory = ref<FoodCategory | null>(null)
const newFoodCalories = ref<number | null>(null)
const newFoodProtein = ref<number | null>(null)
const newFoodCarbs = ref<number | null>(null)
const newFoodFat = ref<number | null>(null)
const isCreatingFood = ref(false)
const createFoodError = ref('')

function handleSubmit() {
  if (foodItemId.value === null || quantityGrams.value === null) return
  emit('submit', {
    foodItemId: foodItemId.value,
    mealType: mealType.value,
    quantityGrams: quantityGrams.value,
  })
  foodItemId.value = null
  mealType.value = null
  quantityGrams.value = null
}

function resetNewFoodFields() {
  newFoodName.value = ''
  newFoodCategory.value = null
  newFoodCalories.value = null
  newFoodProtein.value = null
  newFoodCarbs.value = null
  newFoodFat.value = null
}

async function handleCreateFood() {
  if (!newFoodName.value.trim()) return
  isCreatingFood.value = true
  createFoodError.value = ''
  try {
    const food = await props.createFood({
      name: newFoodName.value.trim(),
      category: newFoodCategory.value,
      calories_per_100g: newFoodCalories.value,
      protein_per_100g: newFoodProtein.value,
      carbs_per_100g: newFoodCarbs.value,
      fat_per_100g: newFoodFat.value,
    })
    foodItemId.value = food.id
    showAddFood.value = false
    resetNewFoodFields()
  } catch {
    createFoodError.value = 'Failed to add food.'
  } finally {
    isCreatingFood.value = false
  }
}
</script>

<template>
  <form
    class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    @submit.prevent="handleSubmit"
  >
    <FoodPicker v-model="foodItemId" :food-items="foodItems" />

    <button
      type="button"
      class="self-start text-xs font-medium text-accent-600 hover:underline"
      @click="showAddFood = !showAddFood"
    >
      {{ showAddFood ? 'Cancel' : "Can't find it? + Add a new food" }}
    </button>

    <div v-if="showAddFood" class="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 p-3">
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Name
        <input
          v-model="newFoodName"
          type="text"
          required
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Category
        <select
          v-model="newFoodCategory"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
        >
          <option :value="null">Unspecified</option>
          <option v-for="c in FOOD_CATEGORIES" :key="c" :value="c">{{ FOOD_CATEGORY_LABELS[c] }}</option>
        </select>
      </label>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Calories
          <input
            v-model.number="newFoodCalories"
            type="number"
            min="0"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Protein (g)
          <input
            v-model.number="newFoodProtein"
            type="number"
            min="0"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Carbs (g)
          <input
            v-model.number="newFoodCarbs"
            type="number"
            min="0"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Fat (g)
          <input
            v-model.number="newFoodFat"
            type="number"
            min="0"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
          />
        </label>
      </div>
      <p class="text-xs text-slate-500">Macros are per 100g.</p>
      <p v-if="createFoodError" class="text-xs text-error">{{ createFoodError }}</p>
      <button
        type="button"
        :disabled="isCreatingFood"
        class="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        @click="handleCreateFood"
      >
        {{ isCreatingFood ? 'Adding…' : 'Add food' }}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Meal
        <select
          v-model="mealType"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
        >
          <option :value="null">Unspecified</option>
          <option v-for="mt in MEAL_TYPES" :key="mt" :value="mt">{{ mt }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Weight (g)
        <input
          v-model.number="quantityGrams"
          type="number"
          step="1"
          min="1"
          required
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
        />
      </label>
    </div>

    <button
      type="submit"
      :disabled="isSubmitting"
      class="self-start rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
    >
      {{ isSubmitting ? 'Adding…' : submitLabel }}
    </button>
  </form>
</template>
