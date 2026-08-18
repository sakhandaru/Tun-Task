import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db/schema'

export function useHabitLogs(habitId: string | null) {
  return useLiveQuery(() => {
    if (!habitId) return []
    return db.habitLogs.where('habitId').equals(habitId).toArray()
  }, [habitId]) ?? []
}
