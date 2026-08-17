export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

export type HabitSchedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: Weekday[] }
  | { kind: 'monthly'; dayOfMonth: number }
  | { kind: 'interval'; intervalDays: number }

export interface Todo {
  id: string
  title: string
  dueDate?: string // YYYY-MM-DD
  scheduledAt?: string // ISO
  completedAt?: string
  cancelledAt?: string
  createdAt: string
  priority?: boolean
  syncedAt?: string
}

export interface Habit {
  id: string
  title: string
  schedule: HabitSchedule
  reminderTime?: string // HH:mm
  archivedAt?: string
  createdAt: string
}

export type HabitLogStatus = 'done' | 'skipped' | 'missed'

export interface HabitLog {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
  status: HabitLogStatus
}

export interface RoutineItem {
  title: string
  priority?: boolean
  scheduledTime?: string // HH:mm
}

export interface Routine {
  id: string
  name: string
  items: RoutineItem[]
}
