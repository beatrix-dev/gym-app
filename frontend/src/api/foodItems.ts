import { apiClient } from './client'
import type { FoodItem, FoodItemCreate } from '@/types'

export async function listFoodItems(): Promise<FoodItem[]> {
  const { data } = await apiClient.get<FoodItem[]>('/food-items')
  return data
}

export async function createFoodItem(payload: FoodItemCreate): Promise<FoodItem> {
  const { data } = await apiClient.post<FoodItem>('/food-items', payload)
  return data
}

export async function deleteFoodItem(foodItemId: number): Promise<void> {
  await apiClient.delete(`/food-items/${foodItemId}`)
}
