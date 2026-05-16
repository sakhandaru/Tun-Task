import { useEffect, useState } from 'react'
import { addDays } from 'date-fns'
import { useRefresh } from '../context/RefreshContext'
import { db } from '../lib/db/schema'
import { isHabitDueToday } from '../lib/db/operations'
import { dateKey, nowInTz, todayKey } from '../lib/dates'
import type { Habit, HabitLog, Routine, Todo, Weekday } from '../lib/db/types'

export function useRefreshToken() {
  return useRefresh()
}

export function useTodayTodos(token: number) {
  const [todos, setTodos] = useState<Todo[]>([])

  useEffect(() => {
    void (async () => {
      const today = todayKey()
      const all = await db.todos.toArray()
      const filtered = all.filter((t) => {
        if (t.cancelledAt) return false
        if (!t.completedAt) {
          return !t.dueDate || t.dueDate <= today
        }
        // Show if completed today (in Jakarta time)
        return dateKey(new Date(t.completedAt)) === today
      })
      
      filtered.sort((a, b) => {
        // Uncompleted first
        if (!a.completedAt && b.completedAt) return -1
        if (a.completedAt && !b.completedAt) return 1
        
        // Then priority
        if (a.priority && !b.priority) return -1
        if (!a.priority && b.priority) return 1
        
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
      })
      setTodos(filtered)
    })()
  }, [token])

  return todos
}

export function useTodayHabits(token: number) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])

  useEffect(() => {
    void (async () => {
      const day = nowInTz().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
      const all = await db.habits.filter((h) => !h.archivedAt).toArray()
      const due = all.filter((h) => isHabitDueToday(h, day))
      const today = todayKey()
      const todayLogs = await db.habitLogs.where('date').equals(today).toArray()
      setHabits(due)
      setLogs(todayLogs)
    })()
  }, [token])

  return { habits, logs }
}

export function useAllHabits(token: number) {
  const [habits, setHabits] = useState<Habit[]>([])

  useEffect(() => {
    void db.habits.filter((h) => !h.archivedAt).toArray().then(setHabits)
  }, [token])

  return habits
}

export function useAllHabitLogs(token: number) {
  const [logs, setLogs] = useState<HabitLog[]>([])

  useEffect(() => {
    void db.habitLogs.toArray().then(setLogs)
  }, [token])

  return logs
}

export function useRoutines(token: number) {
  const [routines, setRoutines] = useState<Routine[]>([])

  useEffect(() => {
    void db.routines.toArray().then(setRoutines)
  }, [token])

  return routines
}

export function useWeeklyStats(token: number) {
  const [stats, setStats] = useState({ done: 0, total: 0, skipped: 0 })

  useEffect(() => {
    void (async () => {
      const logs = await db.habitLogs.toArray()
      const now = nowInTz()
      const weekAgo = addDays(now, -7)
      const cutoff = dateKey(weekAgo)
      const recent = logs.filter((l) => l.date >= cutoff)
      setStats({
        done: recent.filter((l) => l.status === 'done').length,
        skipped: recent.filter((l) => l.status === 'skipped').length,
        total: recent.length,
      })
    })()
  }, [token])

  return stats
}

export function useTomorrowTodos(token: number) {
  const [todos, setTodos] = useState<Todo[]>([])

  useEffect(() => {
    void (async () => {
      const tomorrow = dateKey(addDays(nowInTz(), 1))
      const all = await db.todos.toArray()
      const filtered = all.filter((t) => {
        if (t.cancelledAt) return false
        if (!t.completedAt) {
          return t.dueDate === tomorrow
        }
        return dateKey(new Date(t.completedAt)) === tomorrow
      })

      filtered.sort((a, b) => {
        if (!a.completedAt && b.completedAt) return -1
        if (a.completedAt && !b.completedAt) return 1
        if (a.priority && !b.priority) return -1
        if (!a.priority && b.priority) return 1
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
      })
      setTodos(filtered)
    })()
  }, [token])

  return todos
}

export function useTomorrowHabits(token: number) {
  const [habits, setHabits] = useState<Habit[]>([])

  useEffect(() => {
    void (async () => {
      const tomorrowDate = addDays(nowInTz(), 1)
      const day = tomorrowDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
      const all = await db.habits.filter((h) => !h.archivedAt).toArray()
      const due = all.filter((h) => isHabitDueToday(h, day))
      setHabits(due)
    })()
  }, [token])
  return habits
}

export function useAllTodos(token: number) {
  const [todos, setTodos] = useState<Todo[]>([])

  useEffect(() => {
    void (async () => {
      // For "All Tasks", we might want to show all completed tasks or just recent ones.
      // Let's show everything but sort them so completed are at the bottom.
      const all = await db.todos.toArray()
      all.sort((a, b) => {
        if (!a.completedAt && b.completedAt) return -1
        if (a.completedAt && !b.completedAt) return 1

        const dateA = a.dueDate ?? '9999-99-99'
        const dateB = b.dueDate ?? '9999-99-99'
        if (dateA !== dateB) return dateA.localeCompare(dateB)
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
      })
      setTodos(all)
    })()
  }, [token])

  return todos
}

export function useScoreStats(token: number) {
  const [scores, setScores] = useState({ today: 0, week: 0, month: 0 })

  useEffect(() => {
    void (async () => {
      const allTodos = await db.todos.toArray()
      const allLogs = await db.habitLogs.toArray()
      const allHabits = await db.habits.toArray()
      
      const now = nowInTz()
      const todayK = todayKey()

      const getDailyScore = (dateK: string) => {
        const d = new Date(dateK + 'T12:00:00')
        const dayOfWeek = d.getDay() as Weekday

        // Habits that should run on this day
        const dayHabits = allHabits.filter(h => {
          if (h.schedule.kind === 'daily') return true
          return h.schedule.days.includes(dayOfWeek)
        })

        const dayLogs = allLogs.filter(l => l.date === dateK)
        const dayTodos = allTodos.filter(t => 
          !t.cancelledAt && (t.dueDate === dateK || (t.scheduledAt && dateKey(new Date(t.scheduledAt)) === dateK))
        )

        const totalItems = dayHabits.length + dayTodos.length
        if (totalItems === 0) return 100

        const completedHabits = dayLogs.filter(l => l.status === 'done').length
        const completedTodos = dayTodos.filter(t => !!t.completedAt).length
        
        return Math.round(((completedHabits + completedTodos) / totalItems) * 100)
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
      const dayOfMonth = now.getDate()
      for (let i = 0; i < dayOfMonth; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
        monthTotal += getDailyScore(dateKey(d))
      }

      setScores({
        today: todayScore,
        week: weekTotal,
        month: monthTotal,
      })
    })()
  }, [token])

  return scores
}
