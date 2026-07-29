import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExercisePicker from './ExercisePicker.vue'
import type { Exercise } from '@/types'

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
  {
    id: 2,
    name: 'Lat Pulldown',
    muscle_group: 'back',
    equipment: 'cable',
    category: 'compound',
    is_custom: false,
    is_public: true,
    created_by_user_id: null,
  },
  {
    id: 3,
    name: 'Plank',
    muscle_group: 'core',
    equipment: 'bodyweight',
    category: 'isolation',
    is_custom: false,
    is_public: true,
    created_by_user_id: null,
  },
]

function mountPicker(modelValue: number | null = null) {
  return mount(ExercisePicker, {
    props: {
      modelValue,
      exercises,
    },
  })
}

describe('ExercisePicker', () => {
  it('shows the selected exercise and opens browsing when changed', async () => {
    const wrapper = mountPicker(1)

    expect(wrapper.text()).toContain('Bench Press')
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)

    await wrapper.find('button').trigger('click')

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Lat Pulldown')
  })

  it('filters exercises by search query and muscle group', async () => {
    const wrapper = mountPicker()

    await wrapper.find('input[type="text"]').setValue('press')

    expect(wrapper.text()).toContain('Bench Press')
    expect(wrapper.text()).not.toContain('Lat Pulldown')

    await wrapper.findAll('button').find((button) => button.text() === 'Back')!.trigger('click')

    expect(wrapper.text()).toContain('No exercises match.')
    expect(wrapper.text()).not.toContain('Bench Press')
  })

  it('emits the picked exercise and collapses to the selected state', async () => {
    const wrapper = mountPicker()

    await wrapper.findAll('button').find((button) => button.text().includes('Lat Pulldown'))!.trigger('click')
    await wrapper.setProps({ modelValue: 2 })

    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Lat Pulldown')
  })

  it('shows an empty state when no exercise matches the active filters', async () => {
    const wrapper = mountPicker()

    await wrapper.find('input[type="text"]').setValue('deadlift')

    expect(wrapper.text()).toContain('No exercises match.')
  })
})
