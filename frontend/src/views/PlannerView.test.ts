import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PlannerView from './PlannerView.vue'
import * as exercisesApi from '@/api/exercises'
import * as plansApi from '@/api/workoutPlans'
import type {
  Exercise,
  PlanExerciseRecommendation,
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanExercise,
} from '@/types'

vi.mock('@/api/exercises')
vi.mock('@/api/workoutPlans')

const exercises: Exercise[] = [
  {
    id: 1,
    name: 'Bench Press',
    muscle_group: 'chest',
    equipment: 'barbell',
    category: 'compound',
    is_custom: false,
    is_public: true,
    created_by_user_id: null,
  },
]

const planExercise: WorkoutPlanExercise = {
  id: 1,
  plan_day_id: 1,
  exercise_order: 1,
  target_sets: 3,
  target_reps_min: 8,
  target_reps_max: 10,
  exercise: exercises[0]!,
}

const day: WorkoutPlanDay = {
  id: 1,
  plan_id: 1,
  day_order: 1,
  label: 'Push Day',
  day_of_week: 'monday',
  plan_exercises: [planExercise],
}

const plan: WorkoutPlan = {
  id: 1,
  user_id: 1,
  name: 'Push Pull Legs',
  description: null,
  is_active: true,
  is_public: false,
  forked_from_plan_id: null,
  created_at: '2026-07-01T00:00:00Z',
  days: [day],
}

const recommendation: PlanExerciseRecommendation = {
  plan_exercise_id: 1,
  exercise_id: 1,
  target_reps_min: 8,
  target_reps_max: 10,
  last_session_id: 5,
  last_weight_kg: 60,
  last_reps: 10,
  last_rpe: 7,
  suggested_weight_kg: 62.5,
  rationale: 'Hit top of rep range comfortably — add 2.5kg.',
}

interface TextElement {
  text(): string
  trigger(event: string): Promise<void>
  find(selector: string): TextElement
}

function findByText(wrapper: { findAll(selector: string): TextElement[] }, selector: string, text: string) {
  return wrapper.findAll(selector).find((el) => el.text().includes(text))
}

describe('PlannerView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no plans', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(plansApi.listPlans).mockResolvedValue([])

    const wrapper = mount(PlannerView)
    await flushPromises()

    expect(wrapper.text()).toContain('No plans yet')
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(exercisesApi.listExercises).mockRejectedValue(new Error('network error'))
    vi.mocked(plansApi.listPlans).mockResolvedValue([])

    const wrapper = mount(PlannerView)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load planner data.')
  })

  it('drills down from plan to day to exercise and shows a recommendation', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(plansApi.listPlans).mockResolvedValue([plan])
    vi.mocked(plansApi.getDayRecommendations).mockResolvedValue([recommendation])

    const wrapper = mount(PlannerView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Push Day')

    await findByText(wrapper, 'li', 'Push Pull Legs')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Push Day')
    expect(wrapper.text()).not.toContain('Bench Press')

    await wrapper.find('[data-day-id="1"]').trigger('click')
    await flushPromises()

    expect(plansApi.getDayRecommendations).toHaveBeenCalledWith(1, 1)
    expect(wrapper.text()).toContain('Bench Press')
    expect(wrapper.text()).toContain('Suggested 62.5kg')
    expect(wrapper.text()).toContain('Hit top of rep range comfortably')
  })

  it('creates a new plan and selects it', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(plansApi.listPlans).mockResolvedValue([])
    vi.mocked(plansApi.createPlan).mockResolvedValue({
      id: 2,
      user_id: 1,
      name: 'New Plan',
      description: null,
      is_active: true,
      is_public: false,
      forked_from_plan_id: null,
      created_at: '2026-07-28T00:00:00Z',
      days: [],
    })

    const wrapper = mount(PlannerView)
    await flushPromises()

    await wrapper.find('input[type="text"]').setValue('New Plan')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(plansApi.createPlan).toHaveBeenCalledWith({ name: 'New Plan' })
    expect(wrapper.text()).toContain('New Plan')
    expect(wrapper.text()).toContain('No days yet')
  })

  it('shows recommended exercises for the split and adds one via the sets modal', async () => {
    const overheadPress: Exercise = {
      id: 2,
      name: 'Overhead Press',
      muscle_group: 'shoulders',
      equipment: 'barbell',
      category: 'compound',
      is_custom: false,
      is_public: true,
      created_by_user_id: null,
    }
    const pushDay: WorkoutPlanDay = { ...day, label: 'Push' }
    const pushPlan: WorkoutPlan = { ...plan, days: [pushDay] }

    vi.mocked(exercisesApi.listExercises).mockResolvedValue([exercises[0]!, overheadPress])
    vi.mocked(plansApi.listPlans).mockResolvedValue([pushPlan])
    vi.mocked(plansApi.getDayRecommendations).mockResolvedValue([])
    vi.mocked(plansApi.addPlanExercise).mockResolvedValue({
      id: 2,
      plan_day_id: 1,
      exercise_order: 2,
      target_sets: 4,
      target_reps_min: 6,
      target_reps_max: 8,
      exercise: overheadPress,
    })

    const wrapper = mount(PlannerView)
    await flushPromises()

    await findByText(wrapper, 'li', 'Push Pull Legs')!.trigger('click')
    await flushPromises()
    await wrapper.find('[data-day-id="1"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Recommended for Push')
    // Bench Press is already on the day, so only Overhead Press should be suggested as a chip.
    const chips = wrapper.findAll('button').filter((b) => b.text().startsWith('+ '))
    expect(chips.map((c) => c.text())).toEqual(['+ Overhead Press'])

    await chips[0]!.trigger('click')
    await flushPromises()

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)

    const numberInputs = dialog.findAll('input[type="number"]')
    await numberInputs[0]!.setValue(4)
    await numberInputs[1]!.setValue(6)
    await numberInputs[2]!.setValue(8)
    await dialog.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(plansApi.addPlanExercise).toHaveBeenCalledWith(1, 1, {
      exercise_id: 2,
      exercise_order: 2,
      target_sets: 4,
      target_reps_min: 6,
      target_reps_max: 8,
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('opens the sets modal after picking an exercise from the picker and cancels without adding', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(plansApi.listPlans).mockResolvedValue([plan])
    vi.mocked(plansApi.getDayRecommendations).mockResolvedValue([recommendation])

    const wrapper = mount(PlannerView)
    await flushPromises()

    await findByText(wrapper, 'li', 'Push Pull Legs')!.trigger('click')
    await flushPromises()
    await wrapper.find('[data-day-id="1"]').trigger('click')
    await flushPromises()

    await findByText(wrapper, 'button', 'Bench Press')!.trigger('click')
    await flushPromises()

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)

    await findByText(dialog, 'button', 'Cancel')!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(plansApi.addPlanExercise).not.toHaveBeenCalled()
  })

  it('removes a scheduled day directly from the weekday grid', async () => {
    // Local copies: component code mutates `plan`/`day` in place, and reusing
    // the shared fixtures here would leak this test's deletion into others.
    const localDay: WorkoutPlanDay = { ...day, plan_exercises: [...day.plan_exercises] }
    const localPlan: WorkoutPlan = { ...plan, days: [localDay] }

    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(plansApi.listPlans).mockResolvedValue([localPlan])
    vi.mocked(plansApi.deletePlanDay).mockResolvedValue()

    const wrapper = mount(PlannerView)
    await flushPromises()

    await findByText(wrapper, 'li', 'Push Pull Legs')!.trigger('click')
    await flushPromises()

    const dayCard = wrapper.find('[data-day-id="1"]')
    expect(dayCard.exists()).toBe(true)

    await dayCard.find('button[aria-label="Remove day"]').trigger('click')
    await flushPromises()

    expect(plansApi.deletePlanDay).toHaveBeenCalledWith(1, 1)
    expect(wrapper.find('[data-day-id="1"]').exists()).toBe(false)
  })

  it("reschedules a day's weekday without losing its exercises", async () => {
    const localDay: WorkoutPlanDay = { ...day, plan_exercises: [...day.plan_exercises] }
    const localPlan: WorkoutPlan = { ...plan, days: [localDay] }

    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(plansApi.listPlans).mockResolvedValue([localPlan])
    vi.mocked(plansApi.getDayRecommendations).mockResolvedValue([])
    vi.mocked(plansApi.updatePlanDay).mockResolvedValue({ ...localDay, day_of_week: 'wednesday' })

    const wrapper = mount(PlannerView)
    await flushPromises()

    await findByText(wrapper, 'li', 'Push Pull Legs')!.trigger('click')
    await flushPromises()
    await wrapper.find('[data-day-id="1"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Bench Press')

    await wrapper.find('[data-day-id="1"] select[aria-label="Change weekday"]').setValue('wednesday')
    await flushPromises()

    expect(plansApi.updatePlanDay).toHaveBeenCalledWith(1, 1, { day_of_week: 'wednesday' })
    // Exercises weren't wiped by the reschedule - it's a PATCH, not delete+recreate.
    expect(wrapper.text()).toContain('Bench Press')
  })

  it('deletes a plan', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(plansApi.listPlans).mockResolvedValue([plan])
    vi.mocked(plansApi.deletePlan).mockResolvedValue()

    const wrapper = mount(PlannerView)
    await flushPromises()

    const planRow = findByText(wrapper, 'li', 'Push Pull Legs')!
    await planRow.find('button').trigger('click')
    await flushPromises()

    expect(plansApi.deletePlan).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('No plans yet')
  })
})
