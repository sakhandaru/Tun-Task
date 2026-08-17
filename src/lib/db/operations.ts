import { addDays } from 'date-fns'
import { dateKey, nowInTz, todayKey } from '../dates'
import type { ParsedHabit, ParsedTodo } from '../nlp/types'
import { db } from './schema'
import type { Habit, HabitLog, Routine, Todo, Weekday } from './types'
import { syncTodoToCalendar } from '../gcal'
import { scheduleSync } from '../sync/syncManager'

export async function createTodoFromParsed(parsed: ParsedTodo): Promise<Todo> {
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: parsed.title,
    dueDate: parsed.dueDate ?? todayKey(),
    scheduledAt: parsed.scheduledAt,
    createdAt: new Date().toISOString(),
    priority: parsed.priority,
    project: parsed.project,
  }
  await db.todos.add(todo)
  void syncTodoToCalendar(todo)
  scheduleSync()
  return todo
}

export async function createHabitFromParsed(parsed: ParsedHabit): Promise<Habit> {
  const habit: Habit = {
    id: crypto.randomUUID(),
    title: parsed.title,
    schedule: parsed.schedule,
    reminderTime: parsed.reminderTime,
    createdAt: new Date().toISOString(),
  }
  await db.habits.add(habit)
  scheduleSync()
  return habit
}

export async function completeTodo(id: string): Promise<void> {
  await db.todos.update(id, { completedAt: new Date().toISOString() })
  scheduleSync()
}

export async function uncompleteTodo(id: string): Promise<void> {
  await db.todos.update(id, { completedAt: undefined })
  scheduleSync()
}

export async function cancelTodo(id: string): Promise<void> {
  await db.todos.update(id, { cancelledAt: new Date().toISOString() })
  scheduleSync()
}

export async function snoozeTodo(id: string, days = 1): Promise<void> {
  const todo = await db.todos.get(id)
  if (!todo) return
  const base = todo.dueDate ? new Date(todo.dueDate + 'T12:00:00') : nowInTz()
  await db.todos.update(id, { dueDate: dateKey(addDays(base, days)) })
  scheduleSync()
}

export async function deleteTodo(id: string): Promise<void> {
  await db.todos.delete(id)
  scheduleSync()
}

export function isHabitDueToday(habit: Habit, day: Weekday): boolean {
  if (habit.archivedAt) return false
  if (habit.schedule.kind === 'daily') return true
  return habit.schedule.days.includes(day)
}

export async function getHabitLog(habitId: string, date: string): Promise<HabitLog | undefined> {
  return db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
}

export async function toggleHabitDone(habitId: string, date: string): Promise<void> {
  const existing = await getHabitLog(habitId, date)
  if (existing?.status === 'done') {
    await db.habitLogs.delete(existing.id)
    scheduleSync()
    return
  }
  if (existing) {
    await db.habitLogs.update(existing.id, { status: 'done' })
    scheduleSync()
    return
  }
  await db.habitLogs.add({
    id: crypto.randomUUID(),
    habitId,
    date,
    status: 'done',
  })
  scheduleSync()
}

export async function skipHabit(habitId: string, date: string): Promise<void> {
  const existing = await getHabitLog(habitId, date)
  if (existing) {
    await db.habitLogs.update(existing.id, { status: 'skipped' })
    scheduleSync()
  } else {
    await db.habitLogs.add({
      id: crypto.randomUUID(),
      habitId,
      date,
      status: 'skipped',
    })
    scheduleSync()
  }
}

export async function loadRoutineItems(routineId: string): Promise<void> {
  const routine = await db.routines.get(routineId)
  if (!routine) return
  const today = todayKey()

  for (const item of routine.items) {
    if (item.type === 'todo') {
      await db.todos.add({
        id: crypto.randomUUID(),
        title: item.title,
        dueDate: today,
        createdAt: new Date().toISOString(),
      })
    } else {
      const match = await db.habits.filter((h) => h.title === item.title && !h.archivedAt).first()
      if (!match) {
        await db.habits.add({
          id: crypto.randomUUID(),
          title: item.title,
          schedule: { kind: 'daily' },
          createdAt: new Date().toISOString(),
        })
      }
    }
  }
}

export async function createRoutine(name: string): Promise<Routine> {
  const routine: Routine = {
    id: crypto.randomUUID(),
    name,
    items: [],
  }
  await db.routines.add(routine)
  return routine
}

export async function updateRoutine(id: string, updates: Partial<Routine>): Promise<void> {
  await db.routines.update(id, updates)
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id)
}
