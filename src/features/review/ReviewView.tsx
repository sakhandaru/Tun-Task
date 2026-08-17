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

  // Fetch uncompleted backlog todos
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

  useEffect(() => {
    void fetchBacklog()
  }, [token, showUncompleted])

  const handleCheckTodo = async (id: string) => {
    await completeTodo(id)
    refresh()
    void fetchBacklog()
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Tanpa Tanggal'
    const [y, m, d] = dateStr.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
  }

  // Render Backlog view if toggled open
  if (showUncompleted) {
    return (
      <div className="space-y-6 pt-2">
        <header className="space-y-2">
          <button
            type="button"
            onClick={() => setShowUncompleted(false)}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ← KEMBALI
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Daftar Backlog Tugas
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Semua tugas yang belum dicentang selesai dari waktu ke waktu.
          </p>
        </header>

        {backlogTodos.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <span className="text-2xl block mb-2">🎉</span>
            <p className="text-sm font-medium text-[var(--color-text)]">Semua tugas beres!</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Tidak ada backlog tersisa.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {backlogTodos.map((todo) => {
              const timeStr = formatTime(todo.scheduledAt)
              return (
                <li
                  key={todo.id}
                  className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => void handleCheckTodo(todo.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium text-sm text-[var(--color-text)] leading-snug break-words">
                      {todo.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono tracking-wide text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        📅 {formatDate(todo.dueDate)}
                      </span>
                      {timeStr && (
                        <span className="flex items-center gap-1">
                          ⏰ {timeStr}
                        </span>
                      )}
                      {todo.project && (
                        <span className="flex items-center gap-1 text-[var(--color-accent)]">
                          📁 {todo.project}
                        </span>
                      )}
                      {todo.priority && (
                        <span className="text-amber-500">
                          🔺 PRIORITAS
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  // Render normal Review Dashboard view
  return (
    <div className="space-y-8 pt-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Review</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Refleksi & Skor Pencapaian</p>
      </header>

      {/* Button to Backlog */}
      <button
        type="button"
        onClick={() => setShowUncompleted(true)}
        className="w-full flex items-center justify-between p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-all hover:border-[var(--color-accent)]"
      >
        <div className="flex items-center gap-4 text-left">
          <span className="text-2xl">📋</span>
          <div>
            <span className="block text-sm font-semibold text-[var(--color-text)]">
              Semua Tugas Belum Selesai
            </span>
            <span className="block text-[10px] text-[var(--color-text-muted)] mt-1">
              Lihat backlog tugas beserta tenggat tanggal & waktu
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-accent)]">
          LIHAT →
        </span>
      </button>

      <section>
        <h2 className="section-label mb-4">SKOR KAMU</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-muted)] p-6 text-white shadow-lg shadow-[var(--color-accent)]/20">
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-80">Hari Ini</p>
            <p className="mt-1 text-4xl font-bold">{scores.today}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              <p className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                Minggu Ini
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{scores.week}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              <p className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                Bulan Ini
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{scores.month}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{rate}%</p>
            <p className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
              Kepatuhan Habit
            </p>
          </div>
          <div className="text-right font-mono text-[10px] text-[var(--color-text-muted)]">
            <p>{stats.done} SELESAI</p>
            <p>{stats.skipped} SKIP</p>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="section-label">Refleksi</h2>
        {[
          'Apa yang paling sering kamu lewati minggu ini?',
          'Satu hal kecil untuk minggu depan?',
          'Apa yang sudah berjalan baik — meski kecil?',
        ].map((q) => (
          <p
            key={q}
            className="py-4 text-sm leading-relaxed text-[var(--color-text)]"
          >
            {q}
          </p>
        ))}
      </section>

      <p className="text-center font-mono text-[10px] text-[var(--color-text-muted)]">
        KONSISTEN KECIL &gt; MOTIVASI BESAR
      </p>
    </div>
  )
}
