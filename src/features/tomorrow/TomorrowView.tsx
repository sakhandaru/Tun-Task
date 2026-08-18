import { format, addDays } from 'date-fns'
import { id } from 'date-fns/locale'
import {
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
  const todos = useTomorrowTodos()
  const habits = useTomorrowHabits()
  
  const tomorrowDate = addDays(nowInTz(), 1)
  const dayName = format(tomorrowDate, 'EEE', { locale: id }).toUpperCase()
  const dateFull = format(tomorrowDate, 'd MMM', { locale: id }).toUpperCase()

  return (
    <div className="space-y-8 pt-2">
      <header className="mb-6">
        <p style={{
          fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          margin: 0,
          lineHeight: 1,
          marginBottom: 4,
        }}>
          {dayName} · BESOK
        </p>
        <h1 style={{
          fontFamily: 'GeistPixel Square, Geist Mono Variable, monospace',
          fontSize: 30,
          fontWeight: 300,
          letterSpacing: '-0.02em',
          color: 'var(--color-text)',
          margin: 0,
          lineHeight: 1,
        }}>
          {dateFull}
        </h1>
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
                    )
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
                    onClick={() => void snoozeTodo(todo.id, 1)}
                    style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none' }}
                    className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
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
