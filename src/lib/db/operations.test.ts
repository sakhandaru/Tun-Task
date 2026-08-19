import { describe, expect, it } from 'vitest'
import { isHabitDueToday } from './operations'
import type { Habit } from './types'

describe('isHabitDueToday', () => {
  it('correctly schedules daily habits', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Daily Habit',
      schedule: { kind: 'daily' },
      createdAt: '2026-08-20T00:00:00Z',
    }
    expect(isHabitDueToday(habit, new Date('2026-08-20T12:00:00Z'))).toBe(true)
  })

  it('correctly schedules weekday habits', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Weekday Habit',
      schedule: { kind: 'weekdays', days: [1, 3, 5] }, // Mon, Wed, Fri
      createdAt: '2026-08-20T00:00:00Z',
    }
    // 2026-08-20 is a Thursday (4)
    expect(isHabitDueToday(habit, new Date('2026-08-20T12:00:00Z'))).toBe(false)
    // 2026-08-21 is a Friday (5)
    expect(isHabitDueToday(habit, new Date('2026-08-21T12:00:00Z'))).toBe(true)
  })

  it('correctly schedules interval habits independently of time-of-day', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Interval Habit Every 3 Days',
      schedule: { kind: 'interval', intervalDays: 3 },
      createdAt: '2026-08-20T10:00:00Z', // Created at 17:00 Jakarta time
    }
    // Check same day (0 days diff)
    expect(isHabitDueToday(habit, new Date('2026-08-20T01:00:00Z'))).toBe(true)
    // Check day 1 (1 day diff) -> false
    expect(isHabitDueToday(habit, new Date('2026-08-21T12:00:00Z'))).toBe(false)
    // Check day 3 (3 days diff) -> true
    expect(isHabitDueToday(habit, new Date('2026-08-23T12:00:00Z'))).toBe(true)
  })
})
