import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ExerciseLogView from './ExerciseLogView.vue'
import * as exercisesApi from '@/api/exercises'
import * as sessionsApi from '@/api/workoutSessions'
import type { Exercise, WorkoutSession } from '@/types'

vi.mock('@/api/exercises')
vi.mock('@/api/workoutSessions')

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

describe('ExerciseLogView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    await wrapper.find('select').setValue('1')
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
    await wrapper.find('li button').trigger('click')
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
})
