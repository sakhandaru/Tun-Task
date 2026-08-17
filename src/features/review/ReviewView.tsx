import { useEffect, useState } from 'react'
import { useRefreshToken, useWeeklyStats, useScoreStats } from '../../hooks/useLiveDb'
import { db } from '../../lib/db/schema'
import { completeTodo } from '../../lib/db/operations'
import type { Todo } from '../../lib/db/types'

export function ReviewView() {
  const { token, refresh } = useRefreshToken()
  const stats = useWeeklyStats(token)
  const scores = useScoreStats(token)
  const rate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  const [showUncompleted, setShowUncompleted] = useState(false)
  const [backlogTodos, setBacklogTodos] = useState<Todo[]>([])

  const fetchBacklog = async () => {
    const all = await db.todos.filter(t => !t.completedAt && !t.cancelledAt).toArray()
    const sorted = all.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })
    setBacklogTodos(sorted)
  }

  useEffect(() => { void fetchBacklog() }, [token, showUncompleted])

  const handleCheckTodo = async (id: string) => {
    await completeTodo(id)
    refresh()
    void fetchBacklog()
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    const [y, m, d] = dateStr.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
  }

  // --- BACKLOG VIEW ---
  if (showUncompleted) {
    return (
      <div className="space-y-6 pt-2">
        <header>
          <button
            type="button"
            onClick={() => setShowUncompleted(false)}
            className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ← kembali
          </button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Backlog
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {backlogTodos.length === 0 ? 'Semua bersih.' : `${backlogTodos.length} tugas belum selesai`}
          </p>
        </header>

        {backlogTodos.length === 0 ? (
          <p className="py-12 text-center font-mono text-xs text-[var(--color-text-muted)]">TIDAK ADA BACKLOG</p>
        ) : (
          <ul>
            {backlogTodos.map((todo) => {
              const timeStr = formatTime(todo.scheduledAt)
              return (
                <li
                  key={todo.id}
                  className="list-row"
                >
                  <button
                    type="button"
                    onClick={() => void handleCheckTodo(todo.id)}
                    className="check-circle shrink-0"
                    aria-label="Selesaikan tugas"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text)] leading-snug break-words">
                      {todo.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                      {formatDate(todo.dueDate)}
                      {timeStr && ` · ${timeStr}`}
                      {todo.priority && ' · PRIORITAS'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  // --- MAIN REVIEW VIEW ---
  return (
    <div className="space-y-10 pt-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Review</h1>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Minggu ini</p>
      </header>

      {/* Skor — flat data row, no cards */}
      <section className="space-y-0">
        <p className="section-label mb-4">SKOR</p>

        <div className="list-row">
          <span className="flex-1 text-sm text-[var(--color-text)]">Hari ini</span>
          <span className="font-mono text-xl font-semibold text-[var(--color-text)]">{scores.today}</span>
        </div>
        <div className="list-row">
          <span className="flex-1 text-sm text-[var(--color-text)]">Minggu ini</span>
          <span className="font-mono text-xl font-semibold text-[var(--color-text)]">{scores.week}</span>
        </div>
        <div className="list-row">
          <span className="flex-1 text-sm text-[var(--color-text)]">Bulan ini</span>
          <span className="font-mono text-xl font-semibold text-[var(--color-text)]">{scores.month}</span>
        </div>
      </section>

      {/* Habit compliance — satu baris, no card */}
      <section className="space-y-0">
        <p className="section-label mb-4">HABIT</p>
        <div className="list-row">
          <span className="flex-1 text-sm text-[var(--color-text)]">Kepatuhan minggu ini</span>
          <span className="font-mono text-xl font-semibold text-[var(--color-accent)]">{rate}%</span>
        </div>
        <div className="list-row">
          <span className="flex-1 text-xs text-[var(--color-text-muted)]">Selesai</span>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">{stats.done}</span>
        </div>
        <div className="list-row">
          <span className="flex-1 text-xs text-[var(--color-text-muted)]">Dilewati</span>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">{stats.skipped}</span>
        </div>
      </section>

      {/* Backlog link — inline row, no fat card */}
      <section>
        <p className="section-label mb-4">TUGAS</p>
        <button
          type="button"
          onClick={() => setShowUncompleted(true)}
          className="list-row w-full text-left active:opacity-60 transition-opacity"
        >
          <span className="flex-1 text-sm text-[var(--color-text)]">Belum selesai</span>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            {backlogTodos.length > 0 ? `${backlogTodos.length} →` : '0 →'}
          </span>
        </button>
      </section>

      {/* Refleksi — pertanyaan saja, bersih */}
      <section className="space-y-0">
        <p className="section-label mb-4">REFLEKSI</p>
        {[
          'Apa yang paling sering dilewati minggu ini?',
          'Satu hal kecil untuk minggu depan?',
          'Apa yang sudah berjalan baik?',
        ].map((q) => (
          <div key={q} className="list-row">
            <p className="text-sm text-[var(--color-text-muted)]">{q}</p>
          </div>
        ))}
      </section>

      <p className="pb-4 text-center font-mono text-[9px] tracking-widest text-[var(--color-text-muted)]">
        KONSISTEN KECIL &gt; MOTIVASI BESAR
      </p>
    </div>
  )
}
