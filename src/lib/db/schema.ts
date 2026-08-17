import Dexie, { type EntityTable } from 'dexie'
import type { Habit, HabitLog, Routine, Todo } from './types'

export class TunTaskDB extends Dexie {
  todos!: EntityTable<Todo, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  routines!: EntityTable<Routine, 'id'>

  constructor() {
    super('tuntask')
    this.version(1).stores({
      todos: 'id, dueDate, completedAt, createdAt',
      habits: 'id, archivedAt, createdAt',
      habitLogs: 'id, [habitId+date], habitId, date',
      routines: 'id',
    })
  }
}

export const db = new TunTaskDB()

export async function seedDefaultsIfEmpty(): Promise<void> {
  const habitCount = await db.habits.count()
  const routineCount = await db.routines.count()

  if (habitCount === 0) {
    const now = new Date().toISOString()
    await db.habits.bulkAdd([
      {
        id: crypto.randomUUID(),
        title: 'Minum air',
        schedule: { kind: 'daily' },
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        title: 'Olahraga ringan',
        schedule: { kind: 'daily' },
        createdAt: now,
      },
    ])
  }

  if (routineCount === 0) {
    await db.routines.bulkAdd([
      {
        id: crypto.randomUUID(),
        name: 'Pagi',
        items: [
          { title: 'Minum air' },
          { title: 'Rencanakan 3 prioritas hari ini', priority: true },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Malam',
        items: [
          { title: 'Review hari ini' },
          { title: 'Olahraga ringan' },
        ],
      },
    ])
  }
}
