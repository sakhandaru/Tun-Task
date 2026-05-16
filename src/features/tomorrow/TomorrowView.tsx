import { format, addDays } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  useRefreshToken,
  useTomorrowHabits,
  useTomorrowTodos,
} from '../../hooks/useLiveDb'
import { formatDisplayTime, nowInTz } from '../../lib/dates'
import { completeTodo, snoozeTodo, uncompleteTodo } from '../../lib/db/operations'
import type { Habit } from '../../lib/db/types'

interface TomorrowViewProps {
  onSelectHabit: (habit: Habit) => void
}

export function TomorrowView({ onSelectHabit }: TomorrowViewProps) {
  const { token, refresh } = useRefreshToken()
  const todos = useTomorrowTodos(token)
  const habits = useTomorrowHabits(token)
  
  const tomorrowDate = addDays(nowInTz(), 1)
  const dateLabel = format(tomorrowDate, 'EEEE, d MMMM', { locale: id })

  return (
    <div className="space-y-8 pt-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight capitalize text-[var(--color-text)]">
          {dateLabel}
        </h1>
        <p className="mt-1 text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-widest">
          RENCANA BESOK
        </p>
      </header>

      <section>
        <h2 className="section-label mb-2">Tugas Besok</h2>
        <div className="divider mb-0" />
        {todos.length === 0 ? (
          <p className="py-6 text-sm text-[var(--color-text-muted)]">
            Belum ada tugas untuk besok.
          </p>
        ) : (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id} className="list-row group">
                <button
                  type="button"
                  onClick={() =>
                    void (todo.completedAt
                      ? uncompleteTodo(todo.id)
                      : completeTodo(todo.id)
                    ).then(refresh)
                  }
                  className={`check-circle shrink-0 ${
                    todo.completedAt ? 'check-circle--done' : ''
                  }`}
                  aria-label={todo.completedAt ? 'Batalkan' : 'Selesai'}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[15px] leading-snug ${
                      todo.priority ? 'font-semibold' : ''
                    } ${todo.completedAt ? 'line-through text-[var(--color-text-muted)]' : ''}`}
                  >
                    {todo.title}
                  </p>
                  {todo.scheduledAt && (
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                      {formatDisplayTime(new Date(todo.scheduledAt))}
                    </p>
                  )}
                </div>
                {!todo.completedAt && (
                  <button
                    type="button"
                    onClick={() => void snoozeTodo(todo.id, 1).then(refresh)}
                    className="shrink-0 font-mono text-[10px] text-[var(--color-text-muted)]"
                  >
                    LUSA
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-label mb-2">Habit Besok</h2>
        <div className="divider mb-0" />
        {habits.length === 0 ? (
          <p className="py-6 text-sm text-[var(--color-text-muted)]">Tidak ada habit terjadwal.</p>
        ) : (
          <ul>
            {habits.map((habit) => (
              <li key={habit.id} className="list-row">
                <div className="w-5 h-5 rounded-full border border-[var(--color-border)] shrink-0" />
                <button
                  type="button"
                  onClick={() => onSelectHabit(habit)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-[15px] text-[var(--color-text)]">
                    {habit.title}
                  </p>
                  {habit.reminderTime && (
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                      {habit.reminderTime}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
