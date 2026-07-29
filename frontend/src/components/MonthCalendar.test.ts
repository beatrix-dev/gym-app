import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MonthCalendar from './MonthCalendar.vue'

function mountCalendar(selectedDate: string | null = '2026-07-28') {
  return mount(MonthCalendar, {
    props: {
      markedDates: ['2026-07-28', '2026-08-02'],
      selectedDate,
    },
  })
}

describe('MonthCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-28T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a Monday-first six-week calendar around the selected date', () => {
    const wrapper = mountCalendar()

    expect(wrapper.text()).toContain('July 2026')
    expect(wrapper.findAll('.grid.grid-cols-7').at(1)!.findAll('button')).toHaveLength(42)
    expect(wrapper.find('button[data-date="2026-06-29"]').exists()).toBe(true)
    expect(wrapper.find('button[data-date="2026-08-09"]').exists()).toBe(true)
  })

  it('marks selected, marked, and today states', () => {
    const wrapper = mountCalendar()

    const selectedDay = wrapper.find('button[data-date="2026-07-28"]')
    const markedDay = wrapper.find('button[data-date="2026-08-02"]')

    expect(selectedDay.classes()).toContain('bg-accent-600')
    expect(selectedDay.classes()).not.toContain('ring-2')
    expect(markedDay.find('.rounded-full.bg-accent-600').exists()).toBe(true)
  })

  it('emits the selected date when a day is clicked', async () => {
    const wrapper = mountCalendar()

    await wrapper.find('button[data-date="2026-07-15"]').trigger('click')

    expect(wrapper.emitted('date-select')).toEqual([['2026-07-15']])
  })

  it('navigates between months', async () => {
    const wrapper = mountCalendar()

    await wrapper.findAll('button').find((button) => button.text() === '‹')!.trigger('click')
    expect(wrapper.text()).toContain('June 2026')

    await wrapper.findAll('button').find((button) => button.text() === '›')!.trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === '›')!.trigger('click')
    expect(wrapper.text()).toContain('August 2026')
  })
})
