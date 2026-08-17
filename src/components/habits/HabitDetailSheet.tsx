import { useMemo, useState } from 'react'
import { useRefresh } from '../../context/RefreshContext'
import { useHabitLogs } from '../../hooks/useHabitHistory'
import { todayKey } from '../../lib/dates'
import { db } from '../../lib/db/schema'
import { skipHabit, toggleHabitDone } from '../../lib/db/operations'
import { scheduleSync } from '../../lib/sync/syncManager'
import type { Habit } from '../../lib/db/types'
import {
  buildContributionGrid,
  buildMonthGrid,
  monthlyStrike,
} from '../../lib/habits/stats'
import { HabitContributionGraph } from './HabitContributionGraph'
import { HabitMonthCalendar } from './HabitMonthCalendar'
import { ChallengeModal } from '../ChallengeModal'

interface HabitDetailSheetProps {
  habit: Habit | null
  onClose: () => void
}

export function HabitDetailSheet({ habit, onClose }: HabitDetailSheetProps) {
  const { token, refresh } = useRefresh()
  const logs = useHabitLogs(habit?.id ?? null, token)
  const today = todayKey()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showChallenge, setShowChallenge] = useState(false)

  const monthDays = useMemo(
    () => (habit ? buildMonthGrid(habit, logs, year, month) : []),
    [habit, logs, year, month],
  )
  const strike = useMemo(
    () => (habit ? monthlyStrike(habit, logs, year, month) : { completed: 0, scheduled: 0 }),
    [habit, logs, year, month],
  )
  const contribution = useMemo(
    () => (habit ? buildContributionGrid(habit, logs, 12) : []),
    [habit, logs],
  )

  if (!habit) return null

  const todayLog = logs.find((l) => l.date === today)
  const doneToday = todayLog?.status === 'done'

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else setMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else setMonth((m) => m + 1)
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sheet-panel max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-[var(--color-surface)] px-4 pt-4 pb-10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-border)]" />

        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">{habit.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-[var(--color-text-muted)]"
          >
            TUTUP
          </button>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void toggleHabitDone(habit.id, today).then(refresh)}
            className={`check-circle ${doneToday ? 'check-circle--done' : ''}`}
            aria-label={doneToday ? 'Batalkan hari ini' : 'Selesai hari ini'}
          />
          <span className="text-sm text-[var(--color-text-muted)]">
            {doneToday ? 'Selesai hari ini' : 'Tandai selesai hari ini'}
          </span>
          {!doneToday && todayLog?.status !== 'skipped' && (
            <button
              type="button"
              onClick={() => setShowChallenge(true)}
              className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]"
            >
              LEWATI
            </button>
          )}
        </div>

        <div className="mb-10">
          <HabitMonthCalendar
            year={year}
            month={month}
            days={monthDays}
            strike={strike}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        </div>

        <div className="mb-10">
          <HabitContributionGraph cells={contribution} />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              void db.habits
                .update(habit.id, { archivedAt: new Date().toISOString() })
                .then(() => {
                  scheduleSync()
                  refresh()
                  onClose()
                })
            }
            className="w-full py-3 font-mono text-[10px] tracking-widest text-[var(--color-text-muted)] uppercase"
          >
            Arsipkan habit (Sembunyikan)
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Hapus habit ini dan semua riwayatnya secara permanen?')) {
                void db.habits.delete(habit.id).then(() => {
                  void db.habitLogs.where('habitId').equals(habit.id).delete()
                  scheduleSync()
                  refresh()
                  onClose()
                })
              }
            }}
            className="w-full py-3 font-mono text-[10px] tracking-widest text-red-500 uppercase opacity-60 hover:opacity-100"
          >
            Hapus Permanen
          </button>
        </div>
      </div>
      <ChallengeModal
        open={showChallenge}
        title="Lewati Habit?"
        description="Melewati satu hari akan merusak rantai konsistensi Anda."
        phrase="SAYA MENUNDA"
        onConfirm={() => void skipHabit(habit.id, today).then(refresh)}
        onClose={() => setShowChallenge(false)}
      />
    </div>
  )
}
