import { describe, it, expect } from 'vitest'
import {
  serializeTodos,
  parseTodos,
  serializeHabits,
  parseHabits,
} from './markdownSerializer'
import type { Todo, Habit, HabitLog } from '../db/types'

describe('markdownSerializer', () => {
  describe('serializeTodos & parseTodos', () => {
    it('should serialize and parse back correctly', () => {
      const todos: Todo[] = [
        {
          id: '12345',
          title: 'Tugas Utama',
          dueDate: '2026-08-17',
          createdAt: new Date().toISOString(),
          priority: true,
        },
        {
          id: '67890',
          title: 'Tugas Selesai',
          dueDate: '2026-08-16',
          completedAt: new Date('2026-08-16T15:00:00Z').toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'abcde',
          title: 'Tugas Batal',
          cancelledAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ]

      const md = serializeTodos(todos)
      expect(md).toContain('## Active')
      expect(md).toContain('## Completed')
      expect(md).toContain('## Cancelled')
      expect(md).toContain('- [ ] Tugas Utama 📅 2026-08-17 🔺 <!-- id: 12345 -->')
      expect(md).toContain('- [x] Tugas Selesai 📅 2026-08-16 [completion:: 2026-08-16] <!-- id: 67890 -->')
      expect(md).toContain('- [-] Tugas Batal <!-- id: abcde -->')

      const parsed = parseTodos(md)
      expect(parsed).toHaveLength(3)

      const parsedActive = parsed.find((t) => t.id === '12345')
      expect(parsedActive?.title).toBe('Tugas Utama')
      expect(parsedActive?.dueDate).toBe('2026-08-17')
      expect(parsedActive?.priority).toBe(true)

      const parsedCompleted = parsed.find((t) => t.id === '67890')
      expect(parsedCompleted?.title).toBe('Tugas Selesai')
      expect(parsedCompleted?.dueDate).toBe('2026-08-16')
      expect(parsedCompleted?.completedAt).toBeDefined()
    })
  })

  describe('serializeHabits & parseHabits', () => {
    it('should serialize and parse habits and logs', () => {
      const habits: Habit[] = [
        {
          id: 'habit1',
          title: 'Minum Air',
          schedule: { kind: 'daily' },
          createdAt: new Date().toISOString(),
        },
      ]

      const logs: HabitLog[] = [
        {
          id: 'log1',
          habitId: 'habit1',
          date: '2026-08-17',
          status: 'done',
        },
        {
          id: 'log2',
          habitId: 'habit1',
          date: '2026-08-16',
          status: 'skipped',
        },
      ]

      const md = serializeHabits(habits, logs)
      expect(md).toContain('### Minum Air')
      expect(md).toContain('- [x] 🌱 Minum Air 🔁 every day 📅 2026-08-17 [completion:: 2026-08-17] <!-- id: log1 -->')
      expect(md).toContain('- [-] 🌱 Minum Air 🔁 every day 📅 2026-08-16 <!-- id: log2 -->')

      const { logs: parsedLogs, newHabits } = parseHabits(md, habits)
      expect(newHabits).toHaveLength(0)

      const parsedLog1 = parsedLogs.find((l) => l.id === 'log1')
      expect(parsedLog1?.habitId).toBe('habit1')
      expect(parsedLog1?.date).toBe('2026-08-17')
      expect(parsedLog1?.status).toBe('done')

      const parsedLog2 = parsedLogs.find((l) => l.id === 'log2')
      expect(parsedLog2?.habitId).toBe('habit1')
      expect(parsedLog2?.date).toBe('2026-08-16')
      expect(parsedLog2?.status).toBe('skipped')
    })
  })
})
