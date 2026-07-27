import { apiClient } from './client'
import type { Exercise, PersonalRecord } from '@/types'

export async function listExercises(): Promise<Exercise[]> {
  const { data } = await apiClient.get<Exercise[]>('/exercises')
  return data
}

export async function listPersonalRecords(): Promise<PersonalRecord[]> {
  const { data } = await apiClient.get<PersonalRecord[]>('/exercises/prs')
  return data
}
