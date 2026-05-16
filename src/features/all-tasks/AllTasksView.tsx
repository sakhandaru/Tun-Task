import { useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { useRefreshToken, useAllTodos } from '../../hooks/useLiveDb'
import { todayKey, parseDateKey, formatDisplayTime, nowInTz } from '../../lib/dates'
import { completeTodo, snoozeTodo, uncompleteTodo } from '../../lib/db/operations'
import type { Todo } from '../../lib/db/types'

export function AllTasksView() {
  const { token, refresh } = useRefreshToken()
  const todos = useAllTodos(token)

  const groups = useMemo(() => {
    const today = todayKey()
    const tomorrow = todayKey(addDays(nowInTz(), 1))
    
    const overdue: Todo[] = []
    const forToday: Todo[] = []
    const forTomorrow: Todo[] = []
    const upcoming: Todo[] = []
    const noDate: Todo[] = []

    todos.forEach((todo) => {
      if (!todo.dueDate) {
        noDate.push(todo)
      } else if (todo.dueDate < today) {
        overdue.push(todo)
      } else if (todo.dueDate === today) {
        forToday.push(todo)
      } else if (todo.dueDate === tomorrow) {
        forTomorrow.push(todo)
      } else {
        upcoming.push(todo)
      }
    })

    return [
      { label: 'Terlewat', items: overdue, color: 'text-red-500' },
      { label: 'Hari Ini', items: forToday, color: 'text-[var(--color-accent)]' },
      { label: 'Besok', items: forTomorrow, color: 'text-[var(--color-text)]' },
      { label: 'Mendatang', items: upcoming, color: 'text-[var(--color-text)]' },
      { label: 'Tanpa Tanggal', items: noDate, color: 'text-[var(--color-text-muted)]' },
    ].filter((g) => g.items.length > 0)
  }, [todos])

  return (
    <div className="space-y-8 pt-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
          Semua Tugas
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {todos.length} tugas belum selesai
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Semua tugas sudah beres! 🎉</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className={`section-label mb-2 ${group.color}`}>{group.label}</h2>
              <div className="divider mb-0" />
              <ul>
                {group.items.map((todo) => (
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
                        {todo.dueDate && format(parseDateKey(todo.dueDate), 'd MMM', { locale: id })}
                        {todo.scheduledAt && ` · ${formatDisplayTime(new Date(todo.scheduledAt))}`}
                        {todo.completedAt && ' · SELESAI'}
                      </p>
                    </div>
                    {!todo.completedAt && (
                      <button
                        type="button"
                        onClick={() => void snoozeTodo(todo.id, 1).then(refresh)}
                        className="shrink-0 font-mono text-[10px] text-[var(--color-text-muted)]"
                      >
                        TUNDA
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
