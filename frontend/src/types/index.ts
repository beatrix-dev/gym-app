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

export interface User {
  id: number
  email: string
  display_name: string | null
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
