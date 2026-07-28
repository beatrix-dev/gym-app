import { apiClient } from './client'
import type { DailyTotals, MealPlan, MealPlanCreate, MealPlanEntry, MealPlanEntryCreate } from '@/types'

export async function listMealPlans(): Promise<MealPlan[]> {
  const { data } = await apiClient.get<MealPlan[]>('/meal-plans')
  return data
}

export async function createMealPlan(payload: MealPlanCreate): Promise<MealPlan> {
  const { data } = await apiClient.post<MealPlan>('/meal-plans', payload)
  return data
}

export async function deleteMealPlan(planId: number): Promise<void> {
  await apiClient.delete(`/meal-plans/${planId}`)
}

export async function addMealPlanEntry(
  planId: number,
  payload: MealPlanEntryCreate,
): Promise<MealPlanEntry> {
  const { data } = await apiClient.post<MealPlanEntry>(`/meal-plans/${planId}/entries`, payload)
  return data
}

export async function deleteMealPlanEntry(planId: number, entryId: number): Promise<void> {
  await apiClient.delete(`/meal-plans/${planId}/entries/${entryId}`)
}

export async function getDailyTotals(planId: number): Promise<DailyTotals> {
  const { data } = await apiClient.get<DailyTotals>(`/meal-plans/${planId}/totals`)
  return data
}
