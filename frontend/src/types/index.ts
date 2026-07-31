export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'full_body'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other'

export type ExerciseCategory = 'compound' | 'isolation'

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface User {
  id: number
  email: string
  display_name: string | null
  daily_calorie_target: number | null
}

export interface Exercise {
  id: number
  name: string
  muscle_group: MuscleGroup | null
  equipment: Equipment | null
  category: ExerciseCategory | null
  is_custom: boolean
  is_public: boolean
  created_by_user_id: number | null
}

export interface PersonalRecord {
  exercise_id: number
  session_id: number
  weight_kg: number
  reps: number
  rpe: number | null
  estimated_1rm: number
  achieved_at: string
}

export interface SessionSet {
  id: number
  session_id: number
  exercise_id: number
  set_order: number | null
  weight_kg: number
  reps: number
  rpe: number | null
  is_warmup: boolean
}

export interface SessionSetCreate {
  exercise_id: number
  set_order?: number | null
  weight_kg: number
  reps: number
  rpe?: number | null
  is_warmup?: boolean
}

export interface WorkoutSession {
  id: number
  user_id: number
  plan_day_id: number | null
  started_at: string
  ended_at: string | null
  notes: string | null
  sets: SessionSet[]
}

export interface WorkoutPlanExercise {
  id: number
  plan_day_id: number
  exercise_order: number | null
  target_sets: number | null
  target_reps_min: number | null
  target_reps_max: number | null
  exercise: Exercise
}

export interface WorkoutPlanExerciseCreate {
  exercise_id: number
  exercise_order?: number | null
  target_sets?: number | null
  target_reps_min?: number | null
  target_reps_max?: number | null
}

export interface WorkoutPlanDay {
  id: number
  plan_id: number
  day_order: number
  label: string | null
  day_of_week: DayOfWeek | null
  plan_exercises: WorkoutPlanExercise[]
}

export interface WorkoutPlanDayCreate {
  day_order: number
  label?: string | null
  day_of_week?: DayOfWeek | null
}

export interface WorkoutPlanDayUpdate {
  day_order?: number
  label?: string | null
  day_of_week?: DayOfWeek | null
}

export interface WorkoutPlan {
  id: number
  user_id: number
  name: string | null
  description: string | null
  is_active: boolean
  is_public: boolean
  forked_from_plan_id: number | null
  created_at: string
  days: WorkoutPlanDay[]
}

export interface WorkoutPlanCreate {
  name?: string | null
  description?: string | null
  is_public?: boolean
}

export interface PlanExerciseRecommendation {
  plan_exercise_id: number
  exercise_id: number
  target_reps_min: number | null
  target_reps_max: number | null
  last_session_id: number | null
  last_weight_kg: number | null
  last_reps: number | null
  last_rpe: number | null
  suggested_weight_kg: number | null
  rationale: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FoodCategory = 'protein' | 'dairy' | 'grains' | 'produce' | 'fats_oils' | 'other'

export type FoodUnit = 'grams' | 'ml' | 'tbsp' | 'tsp' | 'cup' | 'piece'

export interface FoodItemUnit {
  id: number
  unit: FoodUnit
  grams_per_unit: number
}

export interface FoodItemUnitCreate {
  unit: FoodUnit
  grams_per_unit: number
}

export interface FoodItem {
  id: number
  name: string
  category: FoodCategory | null
  calories_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
  is_public: boolean
  created_by_user_id: number | null
  units: FoodItemUnit[]
}

export interface FoodItemCreate {
  name: string
  category?: FoodCategory | null
  calories_per_100g?: number | null
  protein_per_100g?: number | null
  carbs_per_100g?: number | null
  fat_per_100g?: number | null
  is_public?: boolean
  units?: FoodItemUnitCreate[]
}

export interface MealPlanEntry {
  id: number
  meal_plan_id: number
  meal_type: MealType | null
  quantity: number
  unit: FoodUnit
  food_item: FoodItem
}

export interface MealPlanEntryCreate {
  food_item_id: number
  meal_type?: MealType | null
  quantity: number
  unit: FoodUnit
}

export interface MealPlan {
  id: number
  user_id: number
  plan_date: string
  entries: MealPlanEntry[]
}

export interface MealPlanCreate {
  plan_date: string
}

export interface DailyTotals {
  meal_plan_id: number
  plan_date: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  daily_calorie_target: number | null
  calories_remaining: number | null
}
