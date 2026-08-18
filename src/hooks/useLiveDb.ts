import { useLiveQuery } from 'dexie-react-hooks'
import { addDays } from 'date-fns'
import { db } from '../lib/db/schema'
import { isHabitDueToday } from '../lib/db/operations'
import { dateKey, nowInTz, todayKey } from '../lib/dates'

export function useTodayTodos() {
  return useLiveQuery(async () => {
    const today = todayKey()
    
    // Uncompleted tasks (completedAt is not defined)
    const uncompleted = await db.todos
      .filter((t) => !t.completedAt && !t.cancelledAt)
      .toArray()
    
    // Completed today
    const completedToday = await db.todos
      .where('completedAt')
      .between(today + 'T00:00:00', today + 'T23:59:59.999Z', true, true)
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
    const weekAgo = addDays(now, -7)
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
      
    // Completed tomorrow
    const completedTomorrow = await db.todos
      .where('completedAt')
      .between(tomorrow + 'T00:00:00', tomorrow + 'T23:59:59.999Z', true, true)
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

export function useScoreStats() {
  const result = useLiveQuery(async () => {
    const now = nowInTz()
    const dayOfMonth = now.getDate()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekAgo = addDays(now, -7)
    
    const minDate = dateKey(weekAgo < startOfCurrentMonth ? weekAgo : startOfCurrentMonth)
    
    // Fetch logs from minDate onwards
    const logs = await db.habitLogs.where('date').aboveOrEqual(minDate).toArray()
    
    // Fetch todos from minDate onwards OR uncompleted todos (since they might be due today)
    const todos = await db.todos
      .filter((t) => !t.cancelledAt && (
        (t.dueDate && t.dueDate >= minDate) || 
        (t.completedAt && t.completedAt >= minDate) || 
        !t.completedAt
      ))
      .toArray()
      
    const todayK = todayKey()

    const getDailyScore = (dateK: string) => {
      const dayLogs = logs.filter((l) => l.date === dateK)
      const dayTodos = todos.filter((t) => 
        !t.cancelledAt && (t.dueDate === dateK || (t.scheduledAt && dateKey(new Date(t.scheduledAt)) === dateK))
      )

      const completedHabits = dayLogs.filter((l) => l.status === 'done').length
      const completedTodos = dayTodos.filter((t) => !!t.completedAt).length
      
      return (completedHabits + completedTodos) * 10
    }

    // Calculate today
    const todayScore = getDailyScore(todayK)

    // Calculate Week (Last 7 days)
    let weekTotal = 0
    for (let i = 0; i < 7; i++) {
      const dk = dateKey(addDays(now, -i))
      weekTotal += getDailyScore(dk)
    }

    // Calculate Month (From day 1)
    let monthTotal = 0
    for (let i = 0; i < dayOfMonth; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
      monthTotal += getDailyScore(dateKey(d))
    }

    return {
      today: todayScore,
      week: weekTotal,
      month: monthTotal,
    }
  })
  
  return result ?? { today: 0, week: 0, month: 0 }
}
