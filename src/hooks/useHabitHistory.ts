import { useEffect, useState } from 'react'
import { db } from '../lib/db/schema'
import type { HabitLog } from '../lib/db/types'

export function useHabitLogs(habitId: string | null, token: number) {
  const [logs, setLogs] = useState<HabitLog[]>([])

  useEffect(() => {
    if (!habitId) {
      setLogs([])
      return
    }
    void db.habitLogs.where('habitId').equals(habitId).toArray().then(setLogs)
  }, [habitId, token])

  return logs
}
