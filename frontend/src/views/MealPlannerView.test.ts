import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MealPlannerView from './MealPlannerView.vue'
import * as foodItemsApi from '@/api/foodItems'
import * as mealPlansApi from '@/api/mealPlans'
import * as authApi from '@/api/auth'
import type { DailyTotals, FoodItem, MealPlan, MealPlanEntry } from '@/types'

vi.mock('@/api/foodItems')
vi.mock('@/api/mealPlans')
vi.mock('@/api/auth')

const chicken: FoodItem = {
  id: 1,
  name: 'Chicken Breast',
  category: 'protein',
  calories_per_100g: 165,
  protein_per_100g: 31,
  carbs_per_100g: 0,
  fat_per_100g: 3.6,
  is_public: false,
  created_by_user_id: 1,
  units: [],
}

const rice: FoodItem = {
  id: 2,
  name: 'Brown Rice',
  category: 'grains',
  calories_per_100g: 123,
  protein_per_100g: 2.7,
  carbs_per_100g: 25.6,
  fat_per_100g: 1.0,
  is_public: false,
  created_by_user_id: 1,
  units: [],
}

const peanutButter: FoodItem = {
  id: 3,
  name: 'Peanut Butter',
  category: 'fats_oils',
  calories_per_100g: 588,
  protein_per_100g: 25.1,
  carbs_per_100g: 20,
  fat_per_100g: 50.4,
  is_public: false,
  created_by_user_id: 1,
  units: [{ id: 1, unit: 'tbsp', grams_per_unit: 16 }],
}

const riceEntry: MealPlanEntry = {
  id: 10,
  meal_plan_id: 5,
  meal_type: 'lunch',
  quantity: 200,
  unit: 'grams',
  food_item: rice,
}

const planWithEntry: MealPlan = {
  id: 5,
  user_id: 1,
  plan_date: '2026-07-28',
  entries: [riceEntry],
}

const emptyTotals: DailyTotals = {
  meal_plan_id: 5,
  plan_date: '2026-07-28',
  total_calories: 0,
  total_protein_g: 0,
  total_carbs_g: 0,
  total_fat_g: 0,
  daily_calorie_target: null,
  calories_remaining: null,
}

const filledTotals: DailyTotals = {
  meal_plan_id: 5,
  plan_date: '2026-07-28',
  total_calories: 246,
  total_protein_g: 5.4,
  total_carbs_g: 51.2,
  total_fat_g: 2.0,
  daily_calorie_target: 2000,
  calories_remaining: 1754,
}

const overTargetTotals: DailyTotals = {
  ...filledTotals,
  total_calories: 2200,
  daily_calorie_target: 2000,
  calories_remaining: -200,
}

// Mirrors MealPlannerView's localIsoDate() so tests can assert against
// whatever "today" actually is without hardcoding (and colliding with) a date.
function localIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayIso = localIsoDate(new Date())

function findButtonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}

async function switchTab(wrapper: ReturnType<typeof mount>, label: "Today's Log" | 'Plan Ahead') {
  await findButtonByText(wrapper, label)!.trigger('click')
  await flushPromises()
}

async function selectCalendarDate(wrapper: ReturnType<typeof mount>, date: string) {
  await wrapper.find(`button[data-date="${date}"]`).trigger('click')
  await flushPromises()
}

async function selectFoodInPicker(wrapper: ReturnType<typeof mount>, name: string) {
  await findButtonByText(wrapper, name)!.trigger('click')
}

describe('MealPlannerView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValue(emptyTotals)
  })

  it('shows an empty state when there are no plans or food items', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([])

    const wrapper = mount(MealPlannerView)
    await flushPromises()

    expect(wrapper.text()).toContain("Today's Log")
    expect(wrapper.text()).toContain('Nothing logged yet')
    expect(wrapper.text()).toContain('No foods match.')
  })

  it('shows an error message when initial data fails to load', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockRejectedValue(new Error('network error'))
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([])

    const wrapper = mount(MealPlannerView)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load meal data. Is the backend running?')
  })

  it('selects a plan and shows its entries and daily totals', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([chicken, rice])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([planWithEntry])
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValue(filledTotals)

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')

    expect(wrapper.text()).not.toContain('200g')
    await selectCalendarDate(wrapper, '2026-07-28')

    expect(wrapper.text()).toContain('Brown Rice')
    expect(wrapper.text()).toContain('200g')
    expect(wrapper.text()).toContain('246')
    expect(wrapper.text()).toContain('1754 calories remaining')
  })

  it('creates a meal plan and selects it', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([])
    vi.mocked(mealPlansApi.createMealPlan).mockResolvedValue({
      id: 9,
      user_id: 1,
      plan_date: '2026-08-01',
      entries: [],
    })

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')

    await selectCalendarDate(wrapper, '2026-08-01')
    await findButtonByText(wrapper, 'Create meal plan')!.trigger('click')
    await flushPromises()

    expect(mealPlansApi.createMealPlan).toHaveBeenCalledWith({ plan_date: '2026-08-01' })
    expect(wrapper.text()).toContain('2026-08-01')
    expect(wrapper.text()).toContain('No entries yet')
  })

  it('deletes a plan and clears totals when it was selected', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([planWithEntry])
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValue(filledTotals)
    vi.mocked(mealPlansApi.deleteMealPlan).mockResolvedValue()

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')

    await selectCalendarDate(wrapper, '2026-07-28')
    expect(wrapper.text()).toContain('Daily totals')

    await findButtonByText(wrapper, 'Delete this plan')!.trigger('click')
    await flushPromises()

    expect(mealPlansApi.deleteMealPlan).toHaveBeenCalledWith(5)
    expect(wrapper.text()).toContain('No meal plan for 2026-07-28 yet.')
    expect(wrapper.text()).not.toContain('Daily totals')
  })

  it('creates a food item inline and auto-selects it in the picker', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([])
    vi.mocked(foodItemsApi.createFoodItem).mockResolvedValue(chicken)

    const wrapper = mount(MealPlannerView)
    await flushPromises()

    await findButtonByText(wrapper, 'Add a new food')!.trigger('click')

    const nameInput = wrapper.findAll('input[type="text"]').find((i) => !i.attributes('placeholder'))!
    await nameInput.setValue('Chicken Breast')
    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[0]!.setValue(165)
    await numberInputs[1]!.setValue(31)
    await numberInputs[2]!.setValue(0)
    await numberInputs[3]!.setValue(3.6)
    await findButtonByText(wrapper, 'Add food')!.trigger('click')
    await flushPromises()

    expect(foodItemsApi.createFoodItem).toHaveBeenCalledWith({
      name: 'Chicken Breast',
      category: null,
      calories_per_100g: 165,
      protein_per_100g: 31,
      carbs_per_100g: 0,
      fat_per_100g: 3.6,
      units: [],
    })
    expect(wrapper.text()).toContain('Chicken Breast')
  })

  it('adds an entry to a plan and re-fetches totals', async () => {
    const emptyPlan: MealPlan = { id: 5, user_id: 1, plan_date: '2026-07-28', entries: [] }
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([chicken, rice])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([emptyPlan])
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValueOnce(emptyTotals).mockResolvedValueOnce(filledTotals)
    vi.mocked(mealPlansApi.addMealPlanEntry).mockResolvedValue(riceEntry)

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')
    await selectCalendarDate(wrapper, '2026-07-28')

    await selectFoodInPicker(wrapper, 'Brown Rice')
    await wrapper.find('select').setValue('lunch')
    await wrapper.find('input[type="number"]').setValue(200)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(mealPlansApi.addMealPlanEntry).toHaveBeenCalledWith(5, {
      food_item_id: 2,
      meal_type: 'lunch',
      quantity: 200,
      unit: 'grams',
    })
    expect(mealPlansApi.getDailyTotals).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('246')
  })

  it('allows two entries with the same food item and meal type on one plan', async () => {
    const secondRiceEntry: MealPlanEntry = { ...riceEntry, id: 11 }
    const planWithTwoEntries: MealPlan = {
      ...planWithEntry,
      entries: [riceEntry, secondRiceEntry],
    }
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([rice])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([planWithTwoEntries])
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValue(filledTotals)

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')
    await selectCalendarDate(wrapper, '2026-07-28')

    const entryRows = wrapper.findAll('li').filter((li) => li.text().includes('200g'))
    expect(entryRows).toHaveLength(2)
  })

  it('allows fractional quantities so non-gram units like tbsp or cup can be logged', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([rice])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([planWithEntry])
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValue(filledTotals)

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')
    await selectCalendarDate(wrapper, '2026-07-28')

    const quantityInput = wrapper.find('input[type="number"][min="0.1"]')
    expect(quantityInput.exists()).toBe(true)
    expect(quantityInput.attributes('step')).toBe('0.1')
  })

  it('shows all-zero totals after deleting the last entry', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([rice])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([planWithEntry])
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValueOnce(filledTotals).mockResolvedValueOnce(emptyTotals)
    vi.mocked(mealPlansApi.deleteMealPlanEntry).mockResolvedValue()

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')
    await selectCalendarDate(wrapper, '2026-07-28')
    expect(wrapper.text()).toContain('246')

    const entryRemoveButton = wrapper
      .findAll('li')
      .find((li) => li.text().includes('Brown Rice'))!
      .find('button')
    await entryRemoveButton.trigger('click')
    await flushPromises()

    expect(mealPlansApi.deleteMealPlanEntry).toHaveBeenCalledWith(5, 10)
    const totalsCards = wrapper.findAll('.grid.grid-cols-2 p.text-lg')
    expect(totalsCards.map((c) => c.text())).toEqual(['0', '0g', '0g', '0g'])
  })

  it('shows remaining calories in green when under target and red when over', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([rice])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([planWithEntry])
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValue(filledTotals)

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')
    await selectCalendarDate(wrapper, '2026-07-28')

    const underTargetText = wrapper.findAll('p').find((p) => p.text().includes('remaining'))
    expect(underTargetText!.classes()).toContain('text-success')

    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValue(overTargetTotals)
    await selectCalendarDate(wrapper, '2026-07-28')

    const overTargetText = wrapper.findAll('p').find((p) => p.text().includes('over target'))
    expect(overTargetText!.classes()).toContain('text-error')
  })

  it('saves a daily calorie target through the auth store', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([])
    vi.mocked(authApi.updateCurrentUser).mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      display_name: null,
      daily_calorie_target: 2200,
    })

    const wrapper = mount(MealPlannerView)
    await flushPromises()

    const targetInput = wrapper.find('input[type="number"][min="0"]')
    await targetInput.setValue(2200)
    await wrapper.findAll('form').at(-1)!.trigger('submit.prevent')
    await flushPromises()

    expect(authApi.updateCurrentUser).toHaveBeenCalledWith({ daily_calorie_target: 2200 })
  })

  it("logs food to today's log without touching the calendar", async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([chicken, rice])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([])
    vi.mocked(mealPlansApi.createMealPlan).mockResolvedValue({
      id: 20,
      user_id: 1,
      plan_date: todayIso,
      entries: [],
    })
    vi.mocked(mealPlansApi.addMealPlanEntry).mockResolvedValue({
      id: 30,
      meal_plan_id: 20,
      meal_type: null,
      quantity: 150,
      unit: 'grams',
      food_item: chicken,
    })
    vi.mocked(mealPlansApi.getDailyTotals).mockResolvedValue(filledTotals)

    const wrapper = mount(MealPlannerView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Meal plans')

    await selectFoodInPicker(wrapper, 'Chicken Breast')
    await wrapper.find('input[type="number"]').setValue(150)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(mealPlansApi.createMealPlan).toHaveBeenCalledWith({ plan_date: todayIso })
    expect(mealPlansApi.addMealPlanEntry).toHaveBeenCalledWith(20, {
      food_item_id: 1,
      meal_type: null,
      quantity: 150,
      unit: 'grams',
    })
    expect(wrapper.text()).toContain('Chicken Breast')
  })

  it("scopes the quantity unit selector to the units the selected food supports", async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([chicken, peanutButter])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([])

    const wrapper = mount(MealPlannerView)
    await flushPromises()

    await selectFoodInPicker(wrapper, 'Chicken Breast')
    const unitSelect = () => wrapper.findAll('select').at(-1)!
    expect(unitSelect().findAll('option').map((o) => o.text())).toEqual(['g'])

    await findButtonByText(wrapper, 'Change')!.trigger('click')
    await selectFoodInPicker(wrapper, 'Peanut Butter')
    expect(unitSelect().findAll('option').map((o) => o.text())).toEqual(['g', 'tbsp'])
  })

  it('groups the food catalog by category', async () => {
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue([chicken, rice])
    vi.mocked(mealPlansApi.listMealPlans).mockResolvedValue([])

    const wrapper = mount(MealPlannerView)
    await flushPromises()
    await switchTab(wrapper, 'Plan Ahead')

    await findButtonByText(wrapper, 'Browse food catalog')!.trigger('click')

    expect(wrapper.text()).toContain('Protein')
    expect(wrapper.text()).toContain('Grains & Carbs')
  })
})
