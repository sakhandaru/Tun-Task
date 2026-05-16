import { describe, expect, it } from 'vitest'
import { buildMonthGrid, monthlyStrike } from './stats'
import type { Habit, HabitLog } from '../db/types'

const habit: Habit = {
  id: 'h1',
  title: 'Minum air',
  schedule: { kind: 'daily' },
  createdAt: '2026-01-01T00:00:00Z',
}

const logs: HabitLog[] = [
  { id: '1', habitId: 'h1', date: '2026-05-14', status: 'done' },
  { id: '2', habitId: 'h1', date: '2026-05-15', status: 'done' },
  { id: '3', habitId: 'h1', date: '2026-05-13', status: 'skipped' },
]

describe('monthlyStrike', () => {
  it('counts completed vs scheduled days', () => {
    const strike = monthlyStrike(habit, logs, 2026, 5)
    expect(strike.completed).toBeGreaterThanOrEqual(2)
    expect(strike.scheduled).toBeGreaterThanOrEqual(strike.completed)
  })
})

describe('buildMonthGrid', () => {
  it('marks done days correctly', () => {
    const grid = buildMonthGrid(habit, logs, 2026, 5)
    const may14 = grid.find((d) => d.date === '2026-05-14' && d.inMonth)
    const may13 = grid.find((d) => d.date === '2026-05-13' && d.inMonth)
    expect(may14?.status).toBe('done')
    expect(may13?.status).toBe('skipped')
  })
})
