<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  markedDates: string[]
  selectedDate: string | null
}>()

const emit = defineEmits<{
  'date-select': [date: string]
}>()

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toIsoDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year: year!, month: month! - 1, day: day! }
}

const today = new Date()
const seed = props.selectedDate ? parseIsoDate(props.selectedDate) : null
const viewYear = ref(seed?.year ?? today.getFullYear())
const viewMonth = ref(seed?.month ?? today.getMonth())

const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate())

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  }),
)

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

interface CalendarCell {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isMarked: boolean
  isSelected: boolean
}

const calendarCells = computed<CalendarCell[]>(() => {
  const markedSet = new Set(props.markedDates)
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  // getDay(): 0=Sun..6=Sat -> convert to a Mon-first offset (0=Mon..6=Sun)
  const leadingCount = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear.value, viewMonth.value, 0).getDate()

  const cells: CalendarCell[] = []

  for (let i = leadingCount - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const month = viewMonth.value === 0 ? 11 : viewMonth.value - 1
    const year = viewMonth.value === 0 ? viewYear.value - 1 : viewYear.value
    const date = toIsoDate(year, month, day)
    cells.push({ date, dayNumber: day, isCurrentMonth: false, isToday: date === todayIso, isMarked: markedSet.has(date), isSelected: date === props.selectedDate })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = toIsoDate(viewYear.value, viewMonth.value, day)
    cells.push({ date, dayNumber: day, isCurrentMonth: true, isToday: date === todayIso, isMarked: markedSet.has(date), isSelected: date === props.selectedDate })
  }

  const trailingCount = 42 - cells.length
  for (let day = 1; day <= trailingCount; day++) {
    const month = viewMonth.value === 11 ? 0 : viewMonth.value + 1
    const year = viewMonth.value === 11 ? viewYear.value + 1 : viewYear.value
    const date = toIsoDate(year, month, day)
    cells.push({ date, dayNumber: day, isCurrentMonth: false, isToday: date === todayIso, isMarked: markedSet.has(date), isSelected: date === props.selectedDate })
  }

  return cells
})

function selectCell(cell: CalendarCell) {
  emit('date-select', cell.date)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <button
        type="button"
        class="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        @click="prevMonth"
      >
        ‹
      </button>
      <p class="text-sm font-semibold text-slate-900">{{ monthLabel }}</p>
      <button
        type="button"
        class="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        @click="nextMonth"
      >
        ›
      </button>
    </div>

    <div class="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-slate-500">
      <span v-for="wd in WEEKDAY_HEADERS" :key="wd">{{ wd }}</span>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="cell in calendarCells"
        :key="cell.date"
        type="button"
        :data-date="cell.date"
        class="flex h-12 w-full flex-col items-center justify-center rounded-md border text-sm"
        :class="[
          cell.isSelected
            ? 'border-accent-600 bg-accent-600 text-white'
            : 'border-slate-200 bg-white hover:bg-slate-50',
          cell.isCurrentMonth ? 'text-slate-900' : 'text-slate-400',
          cell.isSelected ? '' : cell.isToday ? 'ring-2 ring-inset ring-accent-600' : '',
        ]"
        @click="selectCell(cell)"
      >
        <span>{{ cell.dayNumber }}</span>
        <span
          v-if="cell.isMarked && !cell.isSelected"
          class="mt-0.5 h-1 w-1 rounded-full bg-accent-600"
        />
      </button>
    </div>
  </div>
</template>
