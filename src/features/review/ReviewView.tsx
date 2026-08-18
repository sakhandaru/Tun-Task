import { useEffect, useMemo, useState } from 'react'
import { addDays } from 'date-fns'
import { useWeeklyStats, useScoreStats } from '../../hooks/useLiveDb'
import { db } from '../../lib/db/schema'
import { completeTodo } from '../../lib/db/operations'
import { dateKey, nowInTz } from '../../lib/dates'
import type { HabitLog, Todo } from '../../lib/db/types'

const REFLECTIONS = [
  'Apa yang paling sering kamu tunda minggu ini?',
  'Satu kebiasaan kecil untuk ditambahkan minggu depan?',
  'Apa pencapaian terkecil yang pantas disyukuri?',
  'Habit mana yang butuh lebih banyak perhatian?',
  'Apakah kamu sudah istirahat cukup?',
]

// --- Longest streak from habit logs ---
function calcStreak(logs: HabitLog[]): number {
  if (!logs.length) return 0
  const doneDates = [...new Set(logs.filter(l => l.status === 'done').map(l => l.date))].sort()
  if (!doneDates.length) return 0
  let streak = 1
  let max = 1
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1] + 'T12:00:00')
    const curr = new Date(doneDates[i] + 'T12:00:00')
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    streak = diff === 1 ? streak + 1 : 1
    if (streak > max) max = streak
  }
  return max
}

export function ReviewView() {
  const stats = useWeeklyStats()
  const scores = useScoreStats()
  const habitRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  const [backlogTodos, setBacklogTodos] = useState<Todo[]>([])
  const [allLogs, setAllLogs] = useState<HabitLog[]>([])
  const [weekDone, setWeekDone] = useState(0)
  const [weekTotal, setWeekTotal] = useState(0)
  const [showBacklog, setShowBacklog] = useState(false)

  const question = useMemo(() => {
    const idx = new Date().getDay() % REFLECTIONS.length
    return REFLECTIONS[idx]
  }, [])

  useEffect(() => {
    void (async () => {
      const all = await db.todos.filter(t => !t.completedAt && !t.cancelledAt).toArray()
      all.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return a.createdAt.localeCompare(b.createdAt)
      })
      setBacklogTodos(all)

      const logs = await db.habitLogs.toArray()
      setAllLogs(logs)

      // Week task stats (Optimized to single range database scan)
      const now = nowInTz()
      const startDate = dateKey(addDays(now, -6))
      const endDate = dateKey(now)
      
      const weekTodos = await db.todos
        .filter((t) => 
          !t.cancelledAt && (
            (t.dueDate ? (t.dueDate >= startDate && t.dueDate <= endDate) : false) ||
            (t.scheduledAt ? (dateKey(new Date(t.scheduledAt)) >= startDate && dateKey(new Date(t.scheduledAt)) <= endDate) : false)
          )
        )
        .toArray()
      
      let done = 0
      let total = 0
      for (let i = 0; i < 7; i++) {
        const dk = dateKey(addDays(now, -i))
        const dayTodos = weekTodos.filter(t => 
          t.dueDate === dk || (t.scheduledAt ? dateKey(new Date(t.scheduledAt)) === dk : false)
        )
        total += dayTodos.length
        done += dayTodos.filter(t => !!t.completedAt).length
      }
      
      setWeekDone(done)
      setWeekTotal(total)
    })()
  }, [])

  const streak = useMemo(() => calcStreak(allLogs), [allLogs])
  const taskRate = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    const [y, m, d] = dateStr.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
  }

  // --- BACKLOG VIEW ---
  if (showBacklog) {
    return (
      <div className="space-y-6 pt-2">
        <header>
          <button
            type="button"
            onClick={() => setShowBacklog(false)}
            className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ← kembali
          </button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)]">Backlog</h1>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {backlogTodos.length === 0 ? 'Semua bersih.' : `${backlogTodos.length} tugas belum selesai`}
          </p>
        </header>

        {backlogTodos.length === 0 ? (
          <p className="py-12 text-center font-mono text-xs text-[var(--color-text-muted)]">TIDAK ADA BACKLOG</p>
        ) : (
          <ul>
            {backlogTodos.map((todo) => (
              <li key={todo.id} className="list-row">
                <button
                  type="button"
                  onClick={async () => { await completeTodo(todo.id); setBacklogTodos(p => p.filter(t => t.id !== todo.id)) }}
                  className="check-circle shrink-0"
                  aria-label="Selesaikan"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text)] leading-snug">{todo.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                    {formatDate(todo.dueDate)}{todo.priority ? ' · PRIORITAS' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // --- WIDGET GRID VIEW ---
  return (
    <div className="pt-2 pb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] mb-6">Review</h1>

      {/* Bento Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
      }}>

        {/* Widget 1: Skor Hari Ini — full width, tall */}
        <div style={{
          gridColumn: '1 / -1',
          background: 'var(--color-accent)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '120px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
            SKOR HARI INI
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '64px', fontWeight: 700, lineHeight: 1, color: '#fff', letterSpacing: '-2px' }}>
              {scores.today}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.65)', paddingBottom: '6px' }}>
              / 100
            </span>
          </div>
        </div>

        {/* Widget 2: Task Rate — square */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '130px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            TUGAS
          </span>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 700, lineHeight: 1, color: 'var(--color-text)', letterSpacing: '-1px' }}>
              {taskRate}%
            </span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {weekDone}/{weekTotal} MINGGU INI
            </p>
          </div>
        </div>

        {/* Widget 3: Habit Rate — square */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '130px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            HABIT
          </span>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 700, lineHeight: 1, color: 'var(--color-text)', letterSpacing: '-1px' }}>
              {habitRate}%
            </span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {stats.done} SELESAI · {stats.skipped} SKIP
            </p>
          </div>
        </div>

        {/* Widget 4: Streak — square */}
        <div style={{
          background: 'var(--color-text)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-bg)' , opacity: 0.55 }}>
            STREAK
          </span>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 700, lineHeight: 1, color: 'var(--color-bg)', letterSpacing: '-1px' }}>
              {streak}
            </span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-bg)', opacity: 0.55, marginTop: '4px' }}>
              HARI TERPANJANG
            </p>
          </div>
        </div>

        {/* Widget 5: Backlog button — square */}
        <button
          type="button"
          onClick={() => setShowBacklog(true)}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '110px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            BACKLOG
          </span>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 700, lineHeight: 1, color: backlogTodos.length > 0 ? 'var(--color-accent)' : 'var(--color-text)', letterSpacing: '-1px' }}>
              {backlogTodos.length}
            </span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              BUKA →
            </p>
          </div>
        </button>

        {/* Widget 6: Skor Minggu + Bulan — full width */}
        <div style={{
          gridColumn: '1 / -1',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>MINGGU INI</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-1px', lineHeight: 1.1 }}>{scores.week}</p>
          </div>
          <div style={{ width: '1px', height: '40px', background: 'var(--color-border)' }} />
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>BULAN INI</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-1px', lineHeight: 1.1 }}>{scores.month}</p>
          </div>
        </div>

        {/* Widget 7: Refleksi — full width */}
        <div style={{
          gridColumn: '1 / -1',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '20px',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
            REFLEKSI
          </p>
          <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.5 }}>
            {question}
          </p>
        </div>

      </div>
    </div>
  )
}
