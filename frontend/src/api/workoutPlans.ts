import { apiClient } from './client'
import type {
  PlanExerciseRecommendation,
  WorkoutPlan,
  WorkoutPlanCreate,
  WorkoutPlanDay,
  WorkoutPlanDayCreate,
  WorkoutPlanDayUpdate,
  WorkoutPlanExercise,
  WorkoutPlanExerciseCreate,
} from '@/types'

export async function listPlans(): Promise<WorkoutPlan[]> {
  const { data } = await apiClient.get<WorkoutPlan[]>('/workout-plans')
  return data
}

export async function createPlan(payload: WorkoutPlanCreate): Promise<WorkoutPlan> {
  const { data } = await apiClient.post<WorkoutPlan>('/workout-plans', payload)
  return data
}

export async function deletePlan(planId: number): Promise<void> {
  await apiClient.delete(`/workout-plans/${planId}`)
}

export async function createPlanDay(
  planId: number,
  payload: WorkoutPlanDayCreate,
): Promise<WorkoutPlanDay> {
  const { data } = await apiClient.post<WorkoutPlanDay>(`/workout-plans/${planId}/days`, payload)
  return data
}

export async function updatePlanDay(
  planId: number,
  dayId: number,
  payload: WorkoutPlanDayUpdate,
): Promise<WorkoutPlanDay> {
  const { data } = await apiClient.patch<WorkoutPlanDay>(
    `/workout-plans/${planId}/days/${dayId}`,
    payload,
  )
  return data
}

export async function deletePlanDay(planId: number, dayId: number): Promise<void> {
  await apiClient.delete(`/workout-plans/${planId}/days/${dayId}`)
}

export async function addPlanExercise(
  planId: number,
  dayId: number,
  payload: WorkoutPlanExerciseCreate,
): Promise<WorkoutPlanExercise> {
  const { data } = await apiClient.post<WorkoutPlanExercise>(
    `/workout-plans/${planId}/days/${dayId}/exercises`,
    payload,
  )
  return data
}

export async function deletePlanExercise(
  planId: number,
  dayId: number,
  planExerciseId: number,
): Promise<void> {
  await apiClient.delete(`/workout-plans/${planId}/days/${dayId}/exercises/${planExerciseId}`)
}

export async function getDayRecommendations(
  planId: number,
  dayId: number,
): Promise<PlanExerciseRecommendation[]> {
  const { data } = await apiClient.get<PlanExerciseRecommendation[]>(
    `/workout-plans/${planId}/days/${dayId}/recommendations`,
  )
  return data
}
