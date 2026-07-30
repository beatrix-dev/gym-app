<script setup lang="ts">
import type { DailyTotals } from '@/types'

defineProps<{
  totals: DailyTotals | null
  isLoading: boolean
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="isLoading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="totals" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-slate-500">Calories</p>
        <p class="text-lg font-semibold text-slate-900">{{ totals.total_calories }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-slate-500">Protein</p>
        <p class="text-lg font-semibold text-slate-900">{{ totals.total_protein_g }}g</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-slate-500">Carbs</p>
        <p class="text-lg font-semibold text-slate-900">{{ totals.total_carbs_g }}g</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-slate-500">Fat</p>
        <p class="text-lg font-semibold text-slate-900">{{ totals.total_fat_g }}g</p>
      </div>
    </div>

    <p
      v-if="totals?.calories_remaining !== null && totals?.calories_remaining !== undefined"
      class="text-sm"
      :class="totals.calories_remaining >= 0 ? 'text-success' : 'text-error'"
    >
      {{ Math.abs(totals.calories_remaining) }} calories
      {{ totals.calories_remaining >= 0 ? 'remaining' : 'over target' }}
    </p>
  </div>
</template>
