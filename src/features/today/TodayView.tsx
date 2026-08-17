import { useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { HabitMiniHeatmap } from '../../components/habits/HabitMiniHeatmap'
import { ChallengeModal } from '../../components/ChallengeModal'
import {
  useAllHabitLogs,
  useRefreshToken,
  useRoutines,
  useTodayHabits,
  useTodayTodos,
} from '../../hooks/useLiveDb'
import { formatDisplayTime, nowInTz, todayKey } from '../../lib/dates'
import {
  cancelTodo,
  completeTodo,
  loadRoutineItems,
  skipHabit,
  snoozeTodo,
  toggleHabitDone,
  uncompleteTodo,
} from '../../lib/db/operations'
import { getMiniHeatmapDays } from '../../lib/habits/stats'
import type { Habit, HabitLog } from '../../lib/db/types'

interface TodayViewProps {
  onSelectHabit: (habit: Habit) => void
  onOpenSettings: () => void
}

function logStatus(logs: HabitLog[], habitId: string): HabitLog | undefined {
  return logs.find((l) => l.habitId === habitId)
}

export function TodayView({ onSelectHabit, onOpenSettings }: TodayViewProps) {
  const { token, refresh } = useRefreshToken()
  const todos = useTodayTodos(token)
  const { habits, logs } = useTodayHabits(token)
  const allLogs = useAllHabitLogs(token)
  const routines = useRoutines(token)
  const today = todayKey()
  const dateLabel = format(nowInTz(), 'EEEE, d MMMM', { locale: id })

  const [challenge, setChallenge] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  const handleSnooze = (todoId: string) => {
    setChallenge({
      open: true,
      title: 'Tunda Tugas?',
      description: 'Menunda tugas akan menumpuk beban Anda di hari esok.',
      onConfirm: () => void snoozeTodo(todoId).then(refresh),
    })
  }

  const handleSkipHabit = (habitId: string) => {
    setChallenge({
      open: true,
      title: 'Lewati Habit?',
      description: 'Konsistensi adalah kunci. Melewati hari ini berarti merusak momentum Anda.',
      onConfirm: () => void skipHabit(habitId, today).then(refresh),
    })
  }

  const handleCancelTodo = (todoId: string) => {
    setChallenge({
      open: true,
      title: 'Batalkan Tugas?',
      description: 'Tugas ini akan dianggap tidak ada dan tidak mempengaruhi persentase progres.',
      onConfirm: () => void cancelTodo(todoId).then(refresh),
    })
  }

  return (
    <div className="space-y-8 pt-2">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight capitalize text-[var(--color-text)]">
          {dateLabel}
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  for (const r of registrations) {
                    r.unregister()
                  }
                  window.location.reload()
                }).catch(() => {
                  window.location.reload()
                })
              } else {
                window.location.reload()
              }
            }}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Hard Refresh"
            title="Force Reload & Update PWA"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M16 3h5v5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 21H3v-5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Pengaturan"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2v.44a2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2v-.44a2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>

      {routines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {routines.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void loadRoutineItems(r.id).then(refresh)}
              className="chip"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <section>
        <h2 className="section-label mb-2">Tugas</h2>
        <div className="divider mb-0" />
        {todos.length === 0 ? (
          <p className="py-6 text-sm text-[var(--color-text-muted)]">
            Belum ada tugas. Tekan + untuk menambah.
          </p>
        ) : (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id} className="list-row group">
                <button
                  type="button"
                  onClick={() =>
                    void (todo.completedAt ? uncompleteTodo(todo.id) : completeTodo(todo.id)).then(
                      refresh,
                    )
                  }
                  className={`check-circle shrink-0 ${todo.completedAt ? 'check-circle--done' : ''}`}
                  aria-label={todo.completedAt ? 'Batalkan' : 'Selesai'}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[15px] leading-snug ${todo.priority ? 'font-semibold' : ''} ${
                      todo.completedAt ? 'line-through text-[var(--color-text-muted)]' : ''
                    }`}
                  >
                    {todo.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                    {todo.scheduledAt ? formatDisplayTime(new Date(todo.scheduledAt)) : 'Hari ini'}
                    {todo.completedAt && ' · SELESAI'}
                  </p>
                </div>
                {!todo.completedAt && (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleCancelTodo(todo.id)}
                      className="shrink-0 font-mono text-[10px] text-red-500/40 hover:text-red-500 transition-colors"
                    >
                      BATAL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSnooze(todo.id)}
                      className="shrink-0 font-mono text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    >
                      BESOK
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-label mb-2">Habit</h2>
        <div className="divider mb-0" />
        {habits.length === 0 ? (
          <p className="py-6 text-sm text-[var(--color-text-muted)]">Belum ada habit hari ini.</p>
        ) : (
          <ul>
            {habits.map((habit) => {
              const log = logStatus(logs, habit.id)
              const done = log?.status === 'done'
              const habitLogs = allLogs.filter((l) => l.habitId === habit.id)
              const miniDays = getMiniHeatmapDays(habit, habitLogs, 12)

              return (
                <li key={habit.id} className="list-row">
                  <button
                    type="button"
                    onClick={() => void toggleHabitDone(habit.id, today).then(refresh)}
                    className={`check-circle shrink-0 ${done ? 'check-circle--done' : ''}`}
                    aria-label={done ? 'Batalkan' : 'Selesai'}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectHabit(habit)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={`text-[15px] ${done ? 'text-[var(--color-text-muted)] line-through' : ''}`}
                    >
                      {habit.title}
                    </p>
                    <div className="mt-2">
                      <HabitMiniHeatmap days={miniDays} />
                    </div>
                  </button>
                  {!done && log?.status !== 'skipped' && (
                    <button
                      type="button"
                      onClick={() => handleSkipHabit(habit.id)}
                      className="shrink-0 font-mono text-[10px] text-[var(--color-text-muted)]"
                    >
                      LEWATI
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <ChallengeModal
        open={challenge.open}
        title={challenge.title}
        description={challenge.description}
        phrase="SAYA MENUNDA"
        onConfirm={challenge.onConfirm}
        onClose={() => setChallenge((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
