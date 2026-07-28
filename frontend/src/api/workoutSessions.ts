import { apiClient } from './client'
import type { SessionSet, SessionSetCreate, WorkoutSession } from '@/types'

export async function listSessions(): Promise<WorkoutSession[]> {
  const { data } = await apiClient.get<WorkoutSession[]>('/workout-sessions')
  return data
}

export async function startSession(
  planDayId?: number | null,
  notes?: string,
): Promise<WorkoutSession> {
  const { data } = await apiClient.post<WorkoutSession>('/workout-sessions', {
    plan_day_id: planDayId ?? null,
    notes,
  })
  return data
}

export async function logSet(sessionId: number, payload: SessionSetCreate): Promise<SessionSet> {
  const { data } = await apiClient.post<SessionSet>(
    `/workout-sessions/${sessionId}/sets`,
    payload,
  )
  return data
}

export async function deleteSet(sessionId: number, setId: number): Promise<void> {
  await apiClient.delete(`/workout-sessions/${sessionId}/sets/${setId}`)
}

export async function finishSession(sessionId: number): Promise<WorkoutSession> {
  const { data } = await apiClient.patch<WorkoutSession>(`/workout-sessions/${sessionId}`, {
    ended_at: new Date().toISOString(),
  })
  return data
}
