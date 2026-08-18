import { useLiveQuery } from 'dexie-react-hooks'
import { addDays } from 'date-fns'
import { db } from '../lib/db/schema'
import { isHabitDueToday } from '../lib/db/operations'
import { dateKey, nowInTz, todayKey, parseDateKey, addDaysInTz } from '../lib/dates'
import type { Todo } from '../lib/db/types'

export function useTodayTodos() {
  return useLiveQuery(async () => {
    const today = todayKey()
    
    // Uncompleted tasks (completedAt is not defined)
    const uncompleted = await db.todos
      .filter((t) => !t.completedAt && !t.cancelledAt)
      .toArray()
    
    // Completed today (full Jakarta day: from 00:00 WIB to 00:00 WIB next day)
    const completedToday = await db.todos
      .where('completedAt')
      .between(
        parseDateKey(today).toISOString(),
        parseDateKey(dateKey(addDaysInTz(nowInTz(), 1))).toISOString(),
        true,
        false,
      )
      .toArray()
    
    const combined = [...uncompleted, ...completedToday]
    
    // Filter to only include those:
    // - without dueDate, OR
    // - with dueDate <= today
    // AND not cancelled (uncompleted query already checked cancelledAt, but let's check both for safety)
    const filtered = combined.filter((t) => {
      if (t.cancelledAt) return false
      if (!t.completedAt) {
        return !t.dueDate || t.dueDate <= today
      }
      return true // already filtered by completedAt range
    })
    
    filtered.sort((a, b) => {
      if (!a.completedAt && b.completedAt) return -1
      if (a.completedAt && !b.completedAt) return 1
      
      if (a.priority && !b.priority) return -1
      if (!a.priority && b.priority) return 1
      
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
    return filtered
  }) ?? []
}

export function useTodayHabits() {
  const result = useLiveQuery(async () => {
    const todayDate = nowInTz()
    const all = await db.habits.filter((h) => !h.archivedAt).toArray()
    const due = all.filter((h) => isHabitDueToday(h, todayDate))
    const today = todayKey()
    const todayLogs = await db.habitLogs.where('date').equals(today).toArray()
    return { habits: due, logs: todayLogs }
  })
  return result ?? { habits: [], logs: [] }
}

export function useAllHabits() {
  return useLiveQuery(() => db.habits.filter((h) => !h.archivedAt).toArray()) ?? []
}

export function useAllHabitLogs() {
  return useLiveQuery(() => db.habitLogs.toArray()) ?? []
}

export function useRoutines() {
  return useLiveQuery(() => db.routines.toArray()) ?? []
}

export function useWeeklyStats() {
  const result = useLiveQuery(async () => {
    const now = nowInTz()
    const weekAgo = addDays(now, -6)
    const cutoff = dateKey(weekAgo)
    const recent = await db.habitLogs.where('date').aboveOrEqual(cutoff).toArray()
    return {
      done: recent.filter((l) => l.status === 'done').length,
      skipped: recent.filter((l) => l.status === 'skipped').length,
      total: recent.length,
    }
  })
  return result ?? { done: 0, total: 0, skipped: 0 }
}

export function useTomorrowTodos() {
  return useLiveQuery(async () => {
    const tomorrow = dateKey(addDays(nowInTz(), 1))
    
    // Todos due tomorrow
    const dueTomorrow = await db.todos
      .where('dueDate')
      .equals(tomorrow)
      .toArray()
      
    // Completed tomorrow (full Jakarta day)
    const completedTomorrow = await db.todos
      .where('completedAt')
      .between(
        parseDateKey(tomorrow).toISOString(),
        parseDateKey(dateKey(addDaysInTz(nowInTz(), 2))).toISOString(),
        true,
        false,
      )
      .toArray()
      
    const combined = [...dueTomorrow, ...completedTomorrow]
    
    // Deduplicate by ID
    const unique = Array.from(new Map(combined.map(t => [t.id, t])).values())
    const filtered = unique.filter(t => !t.cancelledAt)

    filtered.sort((a, b) => {
      if (!a.completedAt && b.completedAt) return -1
      if (a.completedAt && !b.completedAt) return 1
      if (a.priority && !b.priority) return -1
      if (!a.priority && b.priority) return 1
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
    return filtered
  }) ?? []
}

export function useTomorrowHabits() {
  return useLiveQuery(async () => {
    const tomorrowDate = addDays(nowInTz(), 1)
    const all = await db.habits.filter((h) => !h.archivedAt).toArray()
    const due = all.filter((h) => isHabitDueToday(h, tomorrowDate))
    return due
  }) ?? []
}

export function useAllTodos() {
  return useLiveQuery(async () => {
    const all = await db.todos.toArray()
    all.sort((a, b) => {
      if (!a.completedAt && b.completedAt) return -1
      if (a.completedAt && !b.completedAt) return 1

      const dateA = a.dueDate ?? '9999-99-99'
      const dateB = b.dueDate ?? '9999-99-99'
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
    return all
  }) ?? []
}

export interface ScoreBreakdown {
  habitDone: number
  todoOnTime: number
  todoLate: number
  perfect: boolean
  skipped: number
  cancelled: number
}

const EMPTY_BREAKDOWN: ScoreBreakdown = {
  habitDone: 0,
  todoOnTime: 0,
  todoLate: 0,
  perfect: false,
  skipped: 0,
  cancelled: 0,
}

export function useCompletedTodosInRange(
  from: string,
  to: string,
): (Todo & { completedKey: string })[] {
  return (
    useLiveQuery(async () => {
      const all = await db.todos.toArray()
      return all
        .filter((t) => !!t.completedAt && !t.cancelledAt)
        .map((t) => ({ ...t, completedKey: dateKey(new Date(t.completedAt!)) }))
        .filter((t) => t.completedKey >= from && t.completedKey <= to)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    }) ?? []
  )
}

export function useScoreStats() {
  const result = useLiveQuery(async () => {
    const now = nowInTz()
    const dayOfMonth = now.getDate()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekAgo = addDays(now, -7)

    const minDate = dateKey(weekAgo < startOfCurrentMonth ? weekAgo : startOfCurrentMonth)

    const logs = await db.habitLogs.where('date').aboveOrEqual(minDate).toArray()
    const habits = await db.habits.filter((h) => !h.archivedAt).toArray()

    const todos = await db.todos
      .filter((t) => (
        (t.dueDate && t.dueDate >= minDate) ||
        (t.completedAt && t.completedAt >= minDate) ||
        (t.cancelledAt && t.cancelledAt >= minDate) ||
        (!t.completedAt && !t.cancelledAt)
      ))
      .toArray()

    const todayK = todayKey()

    const dayStats = (
      dateK: string,
    ): Pick<ScoreBreakdown, 'habitDone' | 'todoOnTime' | 'todoLate' | 'skipped' | 'cancelled'> => {
      const dayLogs = logs.filter((l) => l.date === dateK)
      const completedOnDay = todos.filter(
        (t) => !!t.completedAt && !t.cancelledAt && dateKey(new Date(t.completedAt)) === dateK,
      )
      const habitDone = dayLogs.filter((l) => l.status === 'done').length
      const skipped = dayLogs.filter((l) => l.status === 'skipped').length
      const todoOnTime = completedOnDay.filter((t) => {
        const deadline = t.dueDate ?? (t.scheduledAt ? dateKey(new Date(t.scheduledAt)) : undefined)
        return deadline !== undefined && deadline >= dateK
      }).length

      return {
        habitDone,
        skipped,
        todoOnTime,
        todoLate: completedOnDay.length - todoOnTime,
        cancelled: todos.filter((t) => !!t.cancelledAt && dateKey(new Date(t.cancelledAt)) === dateK).length,
      }
    }

    const dayScore = (
      s: Pick<ScoreBreakdown, 'habitDone' | 'todoOnTime' | 'todoLate' | 'skipped' | 'cancelled'>,
      perfect: boolean,
    ): number => {
      const raw =
        s.habitDone * 10 +
        s.todoOnTime * 10 +
        s.todoLate * 5 -
        s.skipped * 5 -
        s.cancelled * 5 +
        (perfect ? 20 : 0)
      return Math.max(0, raw)
    }

    // Today
    const todayStats = dayStats(todayK)
    const dueTodosToday = todos.filter((t) =>
      !t.cancelledAt &&
      (!t.dueDate || t.dueDate === todayK || (t.scheduledAt && dateKey(new Date(t.scheduledAt)) === todayK)),
    )
    const dueHabitIds = new Set(habits.filter((h) => isHabitDueToday(h, now)).map((h) => h.id))
    const hasAnyDue = dueTodosToday.length > 0 || dueHabitIds.size > 0
    const todosPerfect = dueTodosToday.every((t) => !!t.completedAt)
    const habitsPerfect = [...dueHabitIds].every((id) =>
      logs.some((l) => l.date === todayK && l.habitId === id && l.status === 'done'),
    )
    const perfect = hasAnyDue && todosPerfect && habitsPerfect
    const todayScore = dayScore(todayStats, perfect)

    // Week (last 7 days)
    let weekTotal = 0
    for (let i = 0; i < 7; i++) {
      weekTotal += dayScore(dayStats(dateKey(addDays(now, -i))), false)
    }

    // Month (day 1 to today)
    let monthTotal = 0
    for (let i = 0; i < dayOfMonth; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
      monthTotal += dayScore(dayStats(dateKey(d)), false)
    }

    return {
      today: todayScore,
      week: weekTotal,
      month: monthTotal,
      todayBreakdown: { ...todayStats, perfect } satisfies ScoreBreakdown,
    }
  })

  return result ?? { today: 0, week: 0, month: 0, todayBreakdown: EMPTY_BREAKDOWN }
}
