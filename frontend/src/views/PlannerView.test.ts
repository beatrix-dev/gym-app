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

function findByText(wrapper: ReturnType<typeof mount>, selector: string, text: string) {
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

    await findByText(wrapper, 'li', 'Push Day')!.trigger('click')
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
