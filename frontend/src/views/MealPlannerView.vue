<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { createFoodItem, listFoodItems } from '@/api/foodItems'
import {
  addMealPlanEntry,
  createMealPlan,
  deleteMealPlan,
  deleteMealPlanEntry,
  getDailyTotals,
  listMealPlans,
} from '@/api/mealPlans'
import type { DailyTotals, FoodItem, MealPlan, MealType } from '@/types'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const authStore = useAuthStore()

const foodItems = ref<FoodItem[]>([])
const plans = ref<MealPlan[]>([])
const isLoading = ref(true)
const error = ref('')

const selectedPlanId = ref<number | null>(null)
const dailyTotals = ref<DailyTotals | null>(null)
const isLoadingTotals = ref(false)

const newPlanDate = ref('')
const isCreatingPlan = ref(false)

const newEntryFoodItemId = ref<number | null>(null)
const newEntryMealType = ref<MealType | null>(null)
const newEntryQuantity = ref<number | null>(null)
const isAddingEntry = ref(false)

const newFoodName = ref('')
const newFoodCalories = ref<number | null>(null)
const newFoodProtein = ref<number | null>(null)
const newFoodCarbs = ref<number | null>(null)
const newFoodFat = ref<number | null>(null)
const isCreatingFoodItem = ref(false)

const calorieTarget = ref<number | null>(authStore.user?.daily_calorie_target ?? null)
const isSavingTarget = ref(false)

const selectedPlan = computed(() => plans.value.find((p) => p.id === selectedPlanId.value) ?? null)

async function loadInitialData() {
  isLoading.value = true
  error.value = ''
  try {
    ;[foodItems.value, plans.value] = await Promise.all([listFoodItems(), listMealPlans()])
  } catch {
    error.value = 'Failed to load meal data. Is the backend running?'
  } finally {
    isLoading.value = false
  }
}

async function loadTotals() {
  if (!selectedPlan.value) {
    dailyTotals.value = null
    return
  }
  isLoadingTotals.value = true
  try {
    dailyTotals.value = await getDailyTotals(selectedPlan.value.id)
  } catch {
    error.value = 'Failed to load daily totals.'
  } finally {
    isLoadingTotals.value = false
  }
}

function selectPlan(planId: number) {
  selectedPlanId.value = planId
  loadTotals()
}

async function handleCreatePlan() {
  if (!newPlanDate.value) return
  isCreatingPlan.value = true
  error.value = ''
  try {
    const plan = await createMealPlan({ plan_date: newPlanDate.value })
    plans.value.unshift(plan)
    newPlanDate.value = ''
    selectPlan(plan.id)
  } catch {
    error.value = 'Failed to create meal plan.'
  } finally {
    isCreatingPlan.value = false
  }
}

async function handleDeletePlan(planId: number) {
  try {
    await deleteMealPlan(planId)
    plans.value = plans.value.filter((p) => p.id !== planId)
    if (selectedPlanId.value === planId) {
      selectedPlanId.value = null
      dailyTotals.value = null
    }
  } catch {
    error.value = 'Failed to delete meal plan.'
  }
}

async function handleAddEntry() {
  if (!selectedPlan.value || newEntryFoodItemId.value === null || newEntryQuantity.value === null) {
    return
  }
  isAddingEntry.value = true
  error.value = ''
  try {
    const entry = await addMealPlanEntry(selectedPlan.value.id, {
      food_item_id: newEntryFoodItemId.value,
      meal_type: newEntryMealType.value,
      quantity_grams: newEntryQuantity.value,
    })
    selectedPlan.value.entries.push(entry)
    newEntryFoodItemId.value = null
    newEntryMealType.value = null
    newEntryQuantity.value = null
    await loadTotals()
  } catch {
    error.value = 'Failed to add entry.'
  } finally {
    isAddingEntry.value = false
  }
}

async function handleDeleteEntry(entryId: number) {
  if (!selectedPlan.value) return
  try {
    await deleteMealPlanEntry(selectedPlan.value.id, entryId)
    selectedPlan.value.entries = selectedPlan.value.entries.filter((e) => e.id !== entryId)
    await loadTotals()
  } catch {
    error.value = 'Failed to delete entry.'
  }
}

async function handleCreateFoodItem() {
  if (!newFoodName.value.trim()) return
  isCreatingFoodItem.value = true
  error.value = ''
  try {
    const foodItem = await createFoodItem({
      name: newFoodName.value.trim(),
      calories_per_100g: newFoodCalories.value,
      protein_per_100g: newFoodProtein.value,
      carbs_per_100g: newFoodCarbs.value,
      fat_per_100g: newFoodFat.value,
    })
    foodItems.value.push(foodItem)
    foodItems.value.sort((a, b) => a.name.localeCompare(b.name))
    newFoodName.value = ''
    newFoodCalories.value = null
    newFoodProtein.value = null
    newFoodCarbs.value = null
    newFoodFat.value = null
  } catch {
    error.value = 'Failed to create food item.'
  } finally {
    isCreatingFoodItem.value = false
  }
}

async function handleSaveTarget() {
  isSavingTarget.value = true
  error.value = ''
  try {
    await authStore.updateProfile(calorieTarget.value)
    await loadTotals()
  } catch {
    error.value = 'Failed to save calorie target.'
  } finally {
    isSavingTarget.value = false
  }
}

onMounted(loadInitialData)
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Meal Planner</h1>

    <p v-if="error" class="mb-4 text-sm text-error">{{ error }}</p>
    <div v-if="isLoading" class="text-sm text-slate-500">Loading…</div>

    <div v-else class="flex flex-col gap-8">
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-slate-900">Meal plans</h2>
        <p v-if="plans.length === 0" class="text-sm text-slate-500">
          No meal plans yet — create one below.
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
            <span class="font-medium text-slate-900">{{ plan.plan_date }}</span>
            <button class="text-xs text-error hover:opacity-80" @click.stop="handleDeletePlan(plan.id)">
              Remove
            </button>
          </li>
        </ul>

        <form class="flex gap-2" @submit.prevent="handleCreatePlan">
          <input
            v-model="newPlanDate"
            type="date"
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
        <h2 class="text-sm font-semibold text-slate-900">Entries — {{ selectedPlan.plan_date }}</h2>
        <p v-if="selectedPlan.entries.length === 0" class="text-sm text-slate-500">
          No entries yet — add one below.
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="entry in selectedPlan.entries"
            :key="entry.id"
            class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              <span class="font-medium">{{ entry.food_item.name }}</span>
              — {{ entry.quantity_grams }}g
              <span v-if="entry.meal_type" class="ml-1 text-xs text-slate-400">({{ entry.meal_type }})</span>
            </span>
            <button class="text-xs text-error hover:opacity-80" @click="handleDeleteEntry(entry.id)">
              Remove
            </button>
          </li>
        </ul>

        <form
          class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          @submit.prevent="handleAddEntry"
        >
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Food item
            <select
              v-model="newEntryFoodItemId"
              required
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option :value="null" disabled>Select a food item</option>
              <option v-for="f in foodItems" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Meal
              <select
                v-model="newEntryMealType"
                class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
              >
                <option :value="null">Unspecified</option>
                <option v-for="mt in MEAL_TYPES" :key="mt" :value="mt">{{ mt }}</option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Quantity (g)
              <input
                v-model.number="newEntryQuantity"
                type="number"
                step="1"
                min="0.01"
                required
                class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </label>
          </div>

          <button
            type="submit"
            :disabled="isAddingEntry"
            class="self-start rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {{ isAddingEntry ? 'Adding…' : 'Add entry' }}
          </button>
        </form>
      </section>

      <section v-if="selectedPlan" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-slate-900">Daily totals</h2>
        <div v-if="isLoadingTotals" class="text-sm text-slate-500">Loading…</div>
        <div v-else-if="dailyTotals" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs text-slate-500">Calories</p>
            <p class="text-lg font-semibold text-slate-900">{{ dailyTotals.total_calories }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs text-slate-500">Protein</p>
            <p class="text-lg font-semibold text-slate-900">{{ dailyTotals.total_protein_g }}g</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs text-slate-500">Carbs</p>
            <p class="text-lg font-semibold text-slate-900">{{ dailyTotals.total_carbs_g }}g</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs text-slate-500">Fat</p>
            <p class="text-lg font-semibold text-slate-900">{{ dailyTotals.total_fat_g }}g</p>
          </div>
        </div>

        <p
          v-if="dailyTotals?.calories_remaining !== null && dailyTotals?.calories_remaining !== undefined"
          class="text-sm"
          :class="dailyTotals.calories_remaining >= 0 ? 'text-success' : 'text-error'"
        >
          {{ Math.abs(dailyTotals.calories_remaining) }} calories
          {{ dailyTotals.calories_remaining >= 0 ? 'remaining' : 'over target' }}
        </p>

        <form
          class="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          @submit.prevent="handleSaveTarget"
        >
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Daily calorie target
            <input
              v-model.number="calorieTarget"
              type="number"
              min="0"
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            />
          </label>
          <button
            type="submit"
            :disabled="isSavingTarget"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {{ isSavingTarget ? 'Saving…' : 'Save target' }}
          </button>
        </form>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-slate-900">Food catalog</h2>
        <p v-if="foodItems.length === 0" class="text-sm text-slate-500">
          No food items yet — add one below.
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="food in foodItems"
            :key="food.id"
            class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
          >
            <span class="font-medium text-slate-900">{{ food.name }}</span>
            <span class="text-xs text-slate-500">
              {{ food.calories_per_100g ?? '?' }} kcal · {{ food.protein_per_100g ?? '?' }}p ·
              {{ food.carbs_per_100g ?? '?' }}c · {{ food.fat_per_100g ?? '?' }}f (per 100g)
            </span>
          </li>
        </ul>

        <form
          class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          @submit.prevent="handleCreateFoodItem"
        >
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name
            <input
              v-model="newFoodName"
              type="text"
              required
              class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600"
            />
          </label>
          <div class="grid grid-cols-4 gap-3">
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
          <button
            type="submit"
            :disabled="isCreatingFoodItem"
            class="self-start rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {{ isCreatingFoodItem ? 'Adding…' : 'Add food item' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>
