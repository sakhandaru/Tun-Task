import { useAllHabits, useRefreshToken } from '../../hooks/useLiveDb'
import type { Habit } from '../../lib/db/types'

interface HabitsViewProps {
  onSelectHabit: (habit: Habit) => void
}

export function HabitsView({ onSelectHabit }: HabitsViewProps) {
  const { token } = useRefreshToken()
  const habits = useAllHabits(token)

  return (
    <div className="space-y-6 pt-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Habit</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Ketuk untuk lihat kalender & graf
        </p>
      </header>

      {habits.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Belum ada habit aktif.</p>
      ) : (
        <ul>
          {habits.map((habit) => (
            <li key={habit.id} className="list-row">
              <button
                type="button"
                onClick={() => onSelectHabit(habit)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <p className="font-medium text-[var(--color-text)]">{habit.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)] uppercase">
                    {habit.schedule.kind === 'daily' && 'SETIAP HARI'}
                    {habit.schedule.kind === 'weekdays' && `${habit.schedule.days.length} HARI/MINGGU`}
                    {habit.schedule.kind === 'monthly' && `SETIAP TANGGAL ${habit.schedule.dayOfMonth}`}
                    {habit.schedule.kind === 'interval' && `SETIAP ${habit.schedule.intervalDays} HARI`}
                  </p>
                </span>
                <span className="text-[var(--color-text-muted)]">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
