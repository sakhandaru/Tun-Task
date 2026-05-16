import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { id } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { TZ, dateKey, parseDateKey, todayKey } from '../dates'
import { isHabitDueToday } from '../db/operations'
import type { Habit, HabitLog, HabitLogStatus, Weekday } from '../db/types'

export type DayStatus = 'notDue' | 'empty' | 'done' | 'skipped' | 'missed'

export interface MonthDay {
  date: string
  dayOfMonth: number
  inMonth: boolean
  status: DayStatus
}

export interface ContributionCell {
  date: string
  status: DayStatus
  weekIndex: number
  dayIndex: number
}

export interface MonthlyStrike {
  completed: number
  scheduled: number
}

export function isHabitScheduledOnDate(habit: Habit, dateStr: string): boolean {
  if (habit.archivedAt) return false
  const d = parseDateKey(dateStr)
  const zoned = toZonedTime(d, TZ)
  const weekday = getDay(zoned) as Weekday
  return isHabitDueToday(habit, weekday)
}

function resolveStatus(
  habit: Habit,
  dateStr: string,
  logMap: Map<string, HabitLogStatus>,
  today: string,
): DayStatus {
  if (!isHabitScheduledOnDate(habit, dateStr)) return 'notDue'

  const logStatus = logMap.get(dateStr)
  if (logStatus === 'done') return 'done'
  if (logStatus === 'skipped') return 'skipped'
  if (dateStr > today) return 'empty'
  return 'missed'
}

export function buildLogMap(logs: HabitLog[]): Map<string, HabitLogStatus> {
  const map = new Map<string, HabitLogStatus>()
  for (const log of logs) {
    map.set(log.date, log.status)
  }
  return map
}

export function buildMonthGrid(
  habit: Habit,
  logs: HabitLog[],
  year: number,
  month: number,
): MonthDay[] {
  const today = todayKey()
  const logMap = buildLogMap(logs)
  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) => {
    const key = dateKey(d)
    const inMonth = d.getMonth() === month - 1
    return {
      date: key,
      dayOfMonth: d.getDate(),
      inMonth,
      status: inMonth ? resolveStatus(habit, key, logMap, today) : 'notDue',
    }
  })
}

export function monthlyStrike(
  habit: Habit,
  logs: HabitLog[],
  year: number,
  month: number,
): MonthlyStrike {
  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(monthStart)
  const today = todayKey()
  const logMap = buildLogMap(logs)

  let completed = 0
  let scheduled = 0

  for (const d of eachDayOfInterval({ start: monthStart, end: monthEnd })) {
    const key = dateKey(d)
    if (key > today) continue
    if (!isHabitScheduledOnDate(habit, key)) continue
    scheduled++
    if (logMap.get(key) === 'done') completed++
  }

  return { completed, scheduled }
}

export function buildContributionGrid(
  habit: Habit,
  logs: HabitLog[],
  weeks = 12,
): ContributionCell[] {
  const today = todayKey()
  const logMap = buildLogMap(logs)
  const end = endOfWeek(parseDateKey(today), { weekStartsOn: 1 })
  const start = startOfWeek(subWeeks(end, weeks - 1), { weekStartsOn: 1 })

  const cells: ContributionCell[] = []
  let weekIndex = 0
  let cursor = start

  while (cursor <= end) {
    const weekStart = startOfWeek(cursor, { weekStartsOn: 1 })
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const d = addDays(weekStart, dayIndex)
      const key = dateKey(d)
      if (d > end) continue
      cells.push({
        date: key,
        status: resolveStatus(habit, key, logMap, today),
        weekIndex,
        dayIndex,
      })
    }
    weekIndex++
    cursor = addDays(weekStart, 7)
  }

  return cells
}

export function getMiniHeatmapDays(
  habit: Habit,
  logs: HabitLog[],
  days = 12,
): { date: string; status: DayStatus }[] {
  const today = todayKey()
  const logMap = buildLogMap(logs)
  const end = parseDateKey(today)
  const result: { date: string; status: DayStatus }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(end, -i)
    const key = dateKey(d)
    result.push({
      date: key,
      status: resolveStatus(habit, key, logMap, today),
    })
  }

  return result
}

export function formatMonthYear(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: id })
}

export function heatmapCellClass(status: DayStatus): string {
  switch (status) {
    case 'done':
      return 'bg-[var(--color-heatmap-done)]'
    case 'skipped':
      return 'bg-[var(--color-heatmap-2)]'
    case 'missed':
      return 'bg-[var(--color-heatmap-1)]'
    case 'empty':
      return 'bg-[var(--color-heatmap-1)]'
    default:
      return 'bg-[var(--color-heatmap-0)]'
  }
}
