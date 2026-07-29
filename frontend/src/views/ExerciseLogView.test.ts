import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ExerciseLogView from './ExerciseLogView.vue'
import * as exercisesApi from '@/api/exercises'
import * as sessionsApi from '@/api/workoutSessions'
import * as plansApi from '@/api/workoutPlans'
import type { Exercise, PlanExerciseRecommendation, WorkoutPlan, WorkoutSession } from '@/types'

vi.mock('@/api/exercises')
vi.mock('@/api/workoutSessions')
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

const activeSession: WorkoutSession = {
  id: 10,
  user_id: 1,
  plan_day_id: null,
  started_at: '2026-07-27T10:00:00Z',
  ended_at: null,
  notes: null,
  sets: [],
}

const planWithDay: WorkoutPlan = {
  id: 1,
  user_id: 1,
  name: 'Push Pull Legs',
  description: null,
  is_active: true,
  is_public: false,
  forked_from_plan_id: null,
  created_at: '2026-07-01T00:00:00Z',
  days: [
    {
      id: 5,
      plan_id: 1,
      day_order: 1,
      label: 'Push Day',
      day_of_week: null,
      plan_exercises: [],
    },
  ],
}

describe('ExerciseLogView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(plansApi.listPlans).mockResolvedValue([])
  })

  it('shows a start-workout prompt when there is no active session', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([])

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    expect(wrapper.text()).toContain('No workout in progress.')
    expect(wrapper.find('button').text()).toContain('Start workout')
  })

  it('resumes an existing in-progress session', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([activeSession])

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    expect(wrapper.text()).toContain('This session')
    expect(wrapper.text()).not.toContain('No workout in progress.')
  })

  it('shows an error when initial data fails to load', async () => {
    vi.mocked(exercisesApi.listExercises).mockRejectedValue(new Error('network error'))
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([])

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load data. Is the backend running?')
  })

  it('starts a new session when the button is clicked', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([])
    vi.mocked(sessionsApi.startSession).mockResolvedValue(activeSession)

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(sessionsApi.startSession).toHaveBeenCalled()
    expect(wrapper.text()).toContain('This session')
  })

  it('logs a set against the active session', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([activeSession])
    vi.mocked(sessionsApi.logSet).mockResolvedValue({
      id: 100,
      session_id: 10,
      exercise_id: 1,
      set_order: null,
      weight_kg: 60,
      reps: 5,
      rpe: 8,
      is_warmup: false,
    })

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text().includes('Bench Press'))!.trigger('click')
    await wrapper.find('input[type="number"]').setValue(60)
    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[1]!.setValue(5)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(sessionsApi.logSet).toHaveBeenCalledWith(10, {
      exercise_id: 1,
      weight_kg: 60,
      reps: 5,
      rpe: null,
      is_warmup: false,
    })
    expect(wrapper.text()).toContain('Bench Press')
    expect(wrapper.text()).toContain('60kg × 5')
  })

  it('removes a logged set', async () => {
    const sessionWithSet: WorkoutSession = {
      ...activeSession,
      sets: [
        {
          id: 100,
          session_id: 10,
          exercise_id: 1,
          set_order: null,
          weight_kg: 60,
          reps: 5,
          rpe: null,
          is_warmup: false,
        },
      ],
    }
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([sessionWithSet])
    vi.mocked(sessionsApi.deleteSet).mockResolvedValue()

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('No sets logged yet.')
    const removeButton = wrapper.findAll('button').find((b) => b.text() === 'Remove')
    await removeButton!.trigger('click')
    await flushPromises()

    expect(sessionsApi.deleteSet).toHaveBeenCalledWith(10, 100)
    expect(wrapper.text()).toContain('No sets logged yet.')
  })

  it('finishes the session and returns to the start prompt', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([activeSession])
    vi.mocked(sessionsApi.finishSession).mockResolvedValue({
      ...activeSession,
      ended_at: '2026-07-27T11:00:00Z',
    })

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    const finishButton = wrapper.findAll('button').find((b) => b.text().includes('Finish workout'))
    await finishButton!.trigger('click')
    await flushPromises()

    expect(sessionsApi.finishSession).toHaveBeenCalledWith(10)
    expect(wrapper.text()).toContain('No workout in progress.')
  })

  it('starts a session against a plan day when one is picked', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([])
    vi.mocked(plansApi.listPlans).mockResolvedValue([planWithDay])
    vi.mocked(sessionsApi.startSession).mockResolvedValue({ ...activeSession, plan_day_id: 5 })
    vi.mocked(plansApi.getDayRecommendations).mockResolvedValue([])

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    expect(wrapper.text()).toContain('Push Pull Legs — Push Day')
    await wrapper.find('select').setValue('5')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(sessionsApi.startSession).toHaveBeenCalledWith(5)
    expect(plansApi.getDayRecommendations).toHaveBeenCalledWith(1, 5)
  })

  it('shows a suggested weight for a matching exercise and can apply it', async () => {
    const planLinkedSession: WorkoutSession = { ...activeSession, plan_day_id: 5 }
    const recommendation: PlanExerciseRecommendation = {
      plan_exercise_id: 1,
      exercise_id: 1,
      target_reps_min: 8,
      target_reps_max: 10,
      last_session_id: 9,
      last_weight_kg: 60,
      last_reps: 10,
      last_rpe: 7,
      suggested_weight_kg: 62.5,
      rationale: 'Hit top of rep range comfortably — add 2.5kg.',
    }
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(sessionsApi.listSessions).mockResolvedValue([planLinkedSession])
    vi.mocked(plansApi.listPlans).mockResolvedValue([planWithDay])
    vi.mocked(plansApi.getDayRecommendations).mockResolvedValue([recommendation])

    const wrapper = mount(ExerciseLogView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Suggested:')

    await wrapper.findAll('button').find((b) => b.text().includes('Bench Press'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Suggested:')
    expect(wrapper.text()).toContain('62.5kg')

    await wrapper.findAll('button').find((b) => b.text() === 'Use')!.trigger('click')
    const weightInput = wrapper.find('input[type="number"]')
    expect((weightInput.element as HTMLInputElement).value).toBe('62.5')
  })
})
