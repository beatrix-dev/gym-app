<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MonthCalendar from '@/components/MonthCalendar.vue'
import MealEntryForm from '@/components/MealEntryForm.vue'
import DailyTotalsCard from '@/components/DailyTotalsCard.vue'
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
import type { DailyTotals, FoodCategory, FoodItem, FoodItemCreate, MealPlan, MealType } from '@/types'

const FOOD_CATEGORY_ORDER: FoodCategory[] = ['protein', 'dairy', 'grains', 'produce', 'fats_oils', 'other']

const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'Protein',
  dairy: 'Dairy',
  grains: 'Grains & Carbs',
  produce: 'Fruits & Veg',
  fats_oils: 'Fats & Oils',
  other: 'Other',
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const authStore = useAuthStore()

const activeTab = ref<'today' | 'plan'>('today')

const foodItems = ref<FoodItem[]>([])
const plans = ref<MealPlan[]>([])
const isLoading = ref(true)
const error = ref('')

const todayIso = localIsoDate(new Date())
const todayLabel = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const isAddingTodayEntry = ref(false)
const todayTotals = ref<DailyTotals | null>(null)
const isLoadingTodayTotals = ref(false)

const selectedPlanId = ref<number | null>(null)
const dailyTotals = ref<DailyTotals | null>(null)
const isLoadingTotals = ref(false)
const isAddingPlanEntry = ref(false)

const pendingCreateDate = ref<string | null>(null)
const isCreatingPlan = ref(false)

const calorieTarget = ref<number | null>(authStore.user?.daily_calorie_target ?? null)
const isSavingTarget = ref(false)

const isCatalogOpen = ref(false)

const selectedPlan = computed(() => plans.value.find((p) => p.id === selectedPlanId.value) ?? null)
const planDatesSet = computed(() => plans.value.map((p) => p.plan_date))
const todayPlan = computed(() => planForDate(todayIso))

const groupedFoodItems = computed(() => {
  const byCategory = new Map<FoodCategory | null, FoodItem[]>()
  for (const food of foodItems.value) {
    const key = food.category ?? null
    const list = byCategory.get(key) ?? []
    list.push(food)
    byCategory.set(key, list)
  }
  const groups = FOOD_CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => ({
    label: FOOD_CATEGORY_LABELS[c],
    items: byCategory.get(c)!,
  }))
  const uncategorized = byCategory.get(null)
  if (uncategorized) {
    groups.push({ label: 'Uncategorized', items: uncategorized })
  }
  return groups
})

function planForDate(date: string) {
  return plans.value.find((p) => p.plan_date === date) ?? null
}

async function loadInitialData() {
  isLoading.value = true
  error.value = ''
  try {
    ;[foodItems.value, plans.value] = await Promise.all([listFoodItems(), listMealPlans()])
    if (todayPlan.value) {
      await loadTodayTotals()
    }
  } catch {
    error.value = 'Failed to load meal data. Is the backend running?'
  } finally {
    isLoading.value = false
  }
}

async function loadTodayTotals() {
  if (!todayPlan.value) {
    todayTotals.value = null
    return
  }
  isLoadingTodayTotals.value = true
  try {
    todayTotals.value = await getDailyTotals(todayPlan.value.id)
  } catch {
    error.value = 'Failed to load today’s totals.'
  } finally {
    isLoadingTodayTotals.value = false
  }
}

async function ensureTodayPlan(): Promise<MealPlan> {
  const existing = planForDate(todayIso)
  if (existing) return existing
  const plan = await createMealPlan({ plan_date: todayIso })
  plans.value.unshift(plan)
  return plan
}

async function handleAddTodayEntry(payload: { foodItemId: number; mealType: MealType | null; quantityGrams: number }) {
  isAddingTodayEntry.value = true
  error.value = ''
  try {
    const plan = await ensureTodayPlan()
    const entry = await addMealPlanEntry(plan.id, {
      food_item_id: payload.foodItemId,
      meal_type: payload.mealType,
      quantity_grams: payload.quantityGrams,
    })
    plan.entries.push(entry)
    await loadTodayTotals()
  } catch {
    error.value = 'Failed to add entry.'
  } finally {
    isAddingTodayEntry.value = false
  }
}

async function handleDeleteTodayEntry(entryId: number) {
  if (!todayPlan.value) return
  try {
    await deleteMealPlanEntry(todayPlan.value.id, entryId)
    todayPlan.value.entries = todayPlan.value.entries.filter((e) => e.id !== entryId)
    await loadTodayTotals()
  } catch {
    error.value = 'Failed to delete entry.'
  }
}

async function loadPlanTotals() {
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
  loadPlanTotals()
}

function handleDateSelect(date: string) {
  const existing = planForDate(date)
  if (existing) {
    pendingCreateDate.value = null
    selectPlan(existing.id)
  } else {
    selectedPlanId.value = null
    dailyTotals.value = null
    pendingCreateDate.value = date
  }
}

async function handleCreatePlanForDate() {
  if (!pendingCreateDate.value) return
  isCreatingPlan.value = true
  error.value = ''
  try {
    const plan = await createMealPlan({ plan_date: pendingCreateDate.value })
    plans.value.unshift(plan)
    pendingCreateDate.value = null
    selectPlan(plan.id)
  } catch {
    error.value = 'Failed to create meal plan.'
  } finally {
    isCreatingPlan.value = false
  }
}

async function handleDeletePlan(planId: number) {
  try {
    const deletedDate = plans.value.find((p) => p.id === planId)?.plan_date ?? null
    await deleteMealPlan(planId)
    plans.value = plans.value.filter((p) => p.id !== planId)
    if (selectedPlanId.value === planId) {
      selectedPlanId.value = null
      dailyTotals.value = null
      pendingCreateDate.value = deletedDate
    }
  } catch {
    error.value = 'Failed to delete meal plan.'
  }
}

async function handleAddPlanEntry(payload: { foodItemId: number; mealType: MealType | null; quantityGrams: number }) {
  if (!selectedPlan.value) return
  isAddingPlanEntry.value = true
  error.value = ''
  try {
    const entry = await addMealPlanEntry(selectedPlan.value.id, {
      food_item_id: payload.foodItemId,
      meal_type: payload.mealType,
      quantity_grams: payload.quantityGrams,
    })
    selectedPlan.value.entries.push(entry)
    await loadPlanTotals()
  } catch {
    error.value = 'Failed to add entry.'
  } finally {
    isAddingPlanEntry.value = false
  }
}

async function handleDeletePlanEntry(entryId: number) {
  if (!selectedPlan.value) return
  try {
    await deleteMealPlanEntry(selectedPlan.value.id, entryId)
    selectedPlan.value.entries = selectedPlan.value.entries.filter((e) => e.id !== entryId)
    await loadPlanTotals()
  } catch {
    error.value = 'Failed to delete entry.'
  }
}

async function handleCreateFood(payload: FoodItemCreate): Promise<FoodItem> {
  const foodItem = await createFoodItem(payload)
  foodItems.value.push(foodItem)
  foodItems.value.sort((a, b) => a.name.localeCompare(b.name))
  return foodItem
}

async function handleSaveTarget() {
  isSavingTarget.value = true
  error.value = ''
  try {
    await authStore.updateProfile(calorieTarget.value)
    await loadTodayTotals()
    await loadPlanTotals()
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
    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Meals</h1>

    <p v-if="error" class="mb-4 text-sm text-error">{{ error }}</p>
    <div v-if="isLoading" class="text-sm text-slate-500">Loading…</div>

    <div v-else class="flex flex-col gap-6">
      <div class="flex gap-4 border-b border-slate-200 text-sm font-medium">
        <button
          type="button"
          class="-mb-px border-b-2 px-1 py-2"
          :class="activeTab === 'today' ? 'border-accent-600 text-accent-600' : 'border-transparent text-slate-600 hover:text-slate-900'"
          @click="activeTab = 'today'"
        >
          Today's Log
        </button>
        <button
          type="button"
          class="-mb-px border-b-2 px-1 py-2"
          :class="activeTab === 'plan' ? 'border-accent-600 text-accent-600' : 'border-transparent text-slate-600 hover:text-slate-900'"
          @click="activeTab = 'plan'"
        >
          Plan Ahead
        </button>
      </div>

      <div v-if="activeTab === 'today'" class="flex flex-col gap-6">
        <p class="text-sm text-slate-500">{{ todayLabel }} — log what you're eating right now.</p>

        <MealEntryForm
          submit-label="Log food"
          :food-items="foodItems"
          :is-submitting="isAddingTodayEntry"
          :create-food="handleCreateFood"
          @submit="handleAddTodayEntry"
        />

        <section class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold text-slate-900">Logged today</h2>
          <p v-if="!todayPlan || todayPlan.entries.length === 0" class="text-sm text-slate-500">
            Nothing logged yet — use the form above.
          </p>
          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="entry in todayPlan.entries"
              :key="entry.id"
              class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span>
                <span class="font-medium">{{ entry.food_item.name }}</span>
                — {{ entry.quantity_grams }}g
                <span v-if="entry.meal_type" class="ml-1 text-xs text-slate-400">({{ entry.meal_type }})</span>
              </span>
              <button class="text-xs text-error hover:opacity-80" @click="handleDeleteTodayEntry(entry.id)">
                Remove
              </button>
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold text-slate-900">Today's totals</h2>
          <DailyTotalsCard :totals="todayTotals" :is-loading="isLoadingTodayTotals" />

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
      </div>

      <div v-else class="flex flex-col gap-6">
        <section class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold text-slate-900">Meal plans</h2>
          <MonthCalendar
            :marked-dates="planDatesSet"
            :selected-date="selectedPlan?.plan_date ?? null"
            @date-select="handleDateSelect"
          />

          <div v-if="selectedPlan" class="flex items-center justify-between">
            <p class="text-sm text-slate-600">Viewing {{ selectedPlan.plan_date }}</p>
            <button class="text-xs text-error hover:opacity-80" @click="handleDeletePlan(selectedPlan.id)">
              Delete this plan
            </button>
          </div>
          <div
            v-else-if="pendingCreateDate"
            class="flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm"
          >
            <span class="text-slate-600">No meal plan for {{ pendingCreateDate }} yet.</span>
            <button
              :disabled="isCreatingPlan"
              class="rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              @click="handleCreatePlanForDate"
            >
              {{ isCreatingPlan ? 'Creating…' : 'Create meal plan' }}
            </button>
          </div>
          <p v-else class="text-sm text-slate-500">Select a day on the calendar.</p>
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
              <button class="text-xs text-error hover:opacity-80" @click="handleDeletePlanEntry(entry.id)">
                Remove
              </button>
            </li>
          </ul>

          <MealEntryForm
            submit-label="Add entry"
            :food-items="foodItems"
            :is-submitting="isAddingPlanEntry"
            :create-food="handleCreateFood"
            @submit="handleAddPlanEntry"
          />
        </section>

        <section v-if="selectedPlan" class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold text-slate-900">Daily totals</h2>
          <DailyTotalsCard :totals="dailyTotals" :is-loading="isLoadingTotals" />
        </section>

        <section class="flex flex-col gap-2">
          <button
            type="button"
            class="self-start text-sm font-semibold text-slate-900 hover:text-accent-600"
            @click="isCatalogOpen = !isCatalogOpen"
          >
            {{ isCatalogOpen ? '▾' : '▸' }} Browse food catalog
          </button>
          <div v-if="isCatalogOpen" class="flex flex-col gap-4">
            <p v-if="foodItems.length === 0" class="text-sm text-slate-500">No food items yet.</p>
            <div v-for="group in groupedFoodItems" :key="group.label" class="flex flex-col gap-2">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ group.label }}</h3>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="food in group.items"
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
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
