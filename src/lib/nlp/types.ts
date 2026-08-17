import type { HabitSchedule } from '../db/types'

export type ParsedItemType = 'todo' | 'habit'

export interface ParsedTodo {
  type: 'todo'
  title: string
  dueDate?: string
  scheduledAt?: string
  priority?: boolean
  project?: string
  confidence: 'high' | 'low'
}

export interface ParsedHabit {
  type: 'habit'
  title: string
  schedule: HabitSchedule
  reminderTime?: string
  confidence: 'high' | 'low'
}

export type ParsedItem = ParsedTodo | ParsedHabit

export interface ParseResult {
  item: ParsedItem | null
  preview: string
  raw: string
}
