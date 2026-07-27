import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PersonalRecordsView from './PersonalRecordsView.vue'
import * as exercisesApi from '@/api/exercises'
import type { Exercise, PersonalRecord } from '@/types'

vi.mock('@/api/exercises')

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

const records: PersonalRecord[] = [
  {
    exercise_id: 1,
    session_id: 10,
    weight_kg: 100,
    reps: 3,
    rpe: 9,
    estimated_1rm: 110,
    achieved_at: '2026-07-01T00:00:00Z',
  },
]

describe('PersonalRecordsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no records', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(exercisesApi.listPersonalRecords).mockResolvedValue([])

    const wrapper = mount(PersonalRecordsView)
    await flushPromises()

    expect(wrapper.text()).toContain('No personal records yet')
  })

  it('renders records with the exercise name and estimated 1RM', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue(exercises)
    vi.mocked(exercisesApi.listPersonalRecords).mockResolvedValue(records)

    const wrapper = mount(PersonalRecordsView)
    await flushPromises()

    expect(wrapper.text()).toContain('Bench Press')
    expect(wrapper.text()).toContain('100kg × 3')
    expect(wrapper.text()).toContain('RPE 9')
    expect(wrapper.text()).toContain('e1RM 110kg')
  })

  it('falls back to a placeholder name for unknown exercises', async () => {
    vi.mocked(exercisesApi.listExercises).mockResolvedValue([])
    vi.mocked(exercisesApi.listPersonalRecords).mockResolvedValue(records)

    const wrapper = mount(PersonalRecordsView)
    await flushPromises()

    expect(wrapper.text()).toContain('#1')
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(exercisesApi.listExercises).mockRejectedValue(new Error('network error'))
    vi.mocked(exercisesApi.listPersonalRecords).mockResolvedValue([])

    const wrapper = mount(PersonalRecordsView)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load personal records.')
  })
})
