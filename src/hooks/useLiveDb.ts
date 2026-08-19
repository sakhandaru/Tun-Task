import { useLiveQuery } from 'dexie-react-hooks'
import { addDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { db } from '../lib/db/schema'
import { isHabitDueToday } from '../lib/db/operations'
import { dateKey, todayKey, parseDateKey, TZ } from '../lib/dates'
import type { Todo, Habit, HabitLog } from '../lib/db/types'

export function useTodayTodos() {
  return useLiveQuery(async () => {
    const today = todayKey()
    
    // Uncompleted tasks (completedAt is not defined)
    const uncompleted = await db.todos
      .filter((t) => !t.completedAt && !t.cancelledAt)
      .toArray()
    
    // Completed today (full day in TZ)
    const completedToday = await db.todos
      .where('completedAt')
      .between(
        parseDateKey(today).toISOString(),
        parseDateKey(dateKey(addDays(new Date(), 1))).toISOString(),
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
    const todayDate = new Date()
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
    const now = new Date()
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
    const tomorrow = dateKey(addDays(new Date(), 1))
    
    // Todos due tomorrow
    const dueTomorrow = await db.todos
      .where('dueDate')
      .equals(tomorrow)
      .toArray()
      
    // Completed tomorrow (full day in TZ)
    const completedTomorrow = await db.todos
      .where('completedAt')
      .between(
        parseDateKey(tomorrow).toISOString(),
        parseDateKey(dateKey(addDays(new Date(), 2))).toISOString(),
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
    const tomorrowDate = addDays(new Date(), 1)
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
  habitDue: number
  habitDone: number
  todoDue: number
  todoDone: number
  target: number
  beres: number
  percent: number
  perfect: boolean
  skipped: number
  cancelled: number
}

const EMPTY_BREAKDOWN: ScoreBreakdown = {
  habitDue: 0,
  habitDone: 0,
  todoDue: 0,
  todoDone: 0,
  target: 0,
  beres: 0,
  percent: 0,
  perfect: false,
  skipped: 0,
  cancelled: 0,
}

export interface ScoreHistoryItem {
  date: string
  habitDue: number
  habitDone: number
  todoDue: number
  todoDone: number
  skipped: number
  cancelled: number
  target: number
  beres: number
  percent: number
}

export interface ScoreStats {
  today: number
  week: number
  month: number
  streak: number
  todayBreakdown: ScoreBreakdown
  history: ScoreHistoryItem[]
}

const EMPTY_STATS: ScoreStats = {
  today: 0,
  week: 0,
  month: 0,
  streak: 0,
  todayBreakdown: EMPTY_BREAKDOWN,
  history: [],
}

function getStatsForDate(todos: Todo[], logs: HabitLog[], habits: Habit[], dateK: string) {
  const dayLogs = logs.filter((l) => l.date === dateK)
  const habitDone = dayLogs.filter((l) => l.status === 'done').length
  const skipped = dayLogs.filter((l) => l.status === 'skipped').length
  
  const habitDue = habits.filter((h) => {
    const isArchived = h.archivedAt && dateKey(new Date(h.archivedAt)) <= dateK
    if (isArchived) return false
    return isHabitDueToday(h, parseDateKey(dateK))
  }).length

  const todoDue = todos.filter((t) => {
    const isCancelled = t.cancelledAt && dateKey(new Date(t.cancelledAt)) <= dateK
    if (isCancelled) return false
    return t.dueDate === dateK || (!t.dueDate && t.scheduledAt && dateKey(new Date(t.scheduledAt)) === dateK)
  }).length

  const todoDone = todos.filter((t) => {
    const isCancelled = t.cancelledAt && dateKey(new Date(t.cancelledAt)) <= dateK
    if (isCancelled) return false
    const isDue = t.dueDate === dateK || (!t.dueDate && t.scheduledAt && dateKey(new Date(t.scheduledAt)) === dateK)
    if (!isDue) return false
    return t.completedAt !== undefined && dateKey(new Date(t.completedAt)) <= dateK
  }).length

  const cancelled = todos.filter((t) => {
    const isDue = t.dueDate === dateK || (!t.dueDate && t.scheduledAt && dateKey(new Date(t.scheduledAt)) === dateK)
    if (!isDue) return false
    return t.cancelledAt !== undefined && dateKey(new Date(t.cancelledAt)) === dateK
  }).length

  const target = habitDue + todoDue
  const beres = habitDone + todoDone
  const percent = target === 0 ? 0 : Math.round((beres / target) * 100)

  return {
    habitDue,
    habitDone,
    todoDue,
    todoDone,
    skipped,
    cancelled,
    target,
    beres,
    percent,
  }
}

function calcPerfectStreak(todos: Todo[], logs: HabitLog[], habits: Habit[], todayK: string): number {
  let streak = 0
  let currentDate = parseDateKey(todayK)
  let isToday = true
  
  for (let i = 0; i < 365; i++) {
    const dateStr = dateKey(currentDate)
    const stats = getStatsForDate(todos, logs, habits, dateStr)
    
    if (stats.target > 0) {
      if (stats.percent === 100) {
        streak++
      } else {
        if (isToday) {
          // Today not perfect yet, doesn't break streak
        } else {
          break
        }
      }
      isToday = false
    }
    
    currentDate = addDays(currentDate, -1)
  }
  
  return streak
}

export function useScoreStats(): ScoreStats {
  const result = useLiveQuery(async () => {
    const rawNow = new Date()
    const todayK = todayKey(rawNow)

    const logs = await db.habitLogs.toArray()
    const habits = await db.habits.toArray()
    const todos = await db.todos.toArray()

    const todayBreakdownRaw = getStatsForDate(todos, logs, habits, todayK)
    
    // Check if perfect
    const zonedNow = toZonedTime(rawNow, TZ)
    const dueHabitIds = new Set(
      habits
        .filter((h) => (!h.archivedAt || dateKey(new Date(h.archivedAt)) > todayK) && isHabitDueToday(h, rawNow))
        .map((h) => h.id)
    )
    const dueTodosTodayCount = todos.filter((t) =>
      (!t.cancelledAt || dateKey(new Date(t.cancelledAt)) > todayK) &&
      (t.dueDate === todayK || (!t.dueDate && t.scheduledAt && dateKey(new Date(t.scheduledAt)) === todayK))
    ).length
    const hasAnyDue = dueTodosTodayCount > 0 || dueHabitIds.size > 0
    const todosPerfect = todos.filter((t) =>
      (!t.cancelledAt || dateKey(new Date(t.cancelledAt)) > todayK) &&
      (t.dueDate === todayK || (!t.dueDate && t.scheduledAt && dateKey(new Date(t.scheduledAt)) === todayK))
    ).every((t) => t.completedAt !== undefined && dateKey(new Date(t.completedAt)) <= todayK)
    
    const habitsPerfect = [...dueHabitIds].every((id) =>
      logs.some((l) => l.date === todayK && l.habitId === id && l.status === 'done')
    )
    const perfect = hasAnyDue && todosPerfect && habitsPerfect

    const todayBreakdown: ScoreBreakdown = {
      ...todayBreakdownRaw,
      perfect,
    }

    // Week (last 7 days)
    let totalBeresWeek = 0
    let totalTargetWeek = 0
    for (let i = 0; i < 7; i++) {
      const dStr = dateKey(addDays(rawNow, -i))
      const stats = getStatsForDate(todos, logs, habits, dStr)
      totalBeresWeek += stats.beres
      totalTargetWeek += stats.target
    }
    const weekScore = totalTargetWeek === 0 ? 0 : Math.round((totalBeresWeek / totalTargetWeek) * 100)

    // Month (day 1 to today)
    let totalBeresMonth = 0
    let totalTargetMonth = 0
    const dayOfMonth = zonedNow.getDate()
    const year = zonedNow.getFullYear()
    const month = zonedNow.getMonth()
    const pad = (n: number) => String(n).padStart(2, '0')
    for (let i = 0; i < dayOfMonth; i++) {
      const dStr = `${year}-${pad(month + 1)}-${pad(i + 1)}`
      const stats = getStatsForDate(todos, logs, habits, dStr)
      totalBeresMonth += stats.beres
      totalTargetMonth += stats.target
    }
    const monthScore = totalTargetMonth === 0 ? 0 : Math.round((totalBeresMonth / totalTargetMonth) * 100)

    // Streak
    const streak = calcPerfectStreak(todos, logs, habits, todayK)

    // History (last 35 days)
    const history: ScoreHistoryItem[] = []
    for (let i = 0; i < 35; i++) {
      const d = addDays(rawNow, -i)
      const dStr = dateKey(d)
      const stats = getStatsForDate(todos, logs, habits, dStr)
      history.push({
        date: dStr,
        ...stats,
      })
    }

    return {
      today: todayBreakdown.percent,
      week: weekScore,
      month: monthScore,
      streak,
      todayBreakdown,
      history,
    }
  })

  return result ?? EMPTY_STATS
}
