import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays } from 'date-fns'
import { useWeeklyStats, useScoreStats } from '../../hooks/useLiveDb'
import { db } from '../../lib/db/schema'
import { completeTodo } from '../../lib/db/operations'
import { dateKey, nowInTz } from '../../lib/dates'
import type { HabitLog, Todo } from '../../lib/db/types'

/* ─── helpers ──────────────────────────────────────────── */
const DAY = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES']

function p2(n: number) {
  return String(n).padStart(2, '0')
}

function calcStreak(logs: HabitLog[]): number {
  if (!logs.length) return 0
  const dates = [...new Set(logs.filter(l => l.status === 'done').map(l => l.date))].sort()
  if (!dates.length) return 0
  let streak = 1, max = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round(
      (new Date(dates[i] + 'T12:00:00').getTime() - new Date(dates[i - 1] + 'T12:00:00').getTime()) / 86400000,
    )
    streak = diff === 1 ? streak + 1 : 1
    if (streak > max) max = streak
  }
  return max
}

/* ─── constants ────────────────────────────────────────── */
const SANS = 'Geist Variable, system-ui, sans-serif'
const MONO = 'Geist Mono Variable, ui-monospace, monospace'
const PIXEL = 'GeistPixel Square, Geist Mono Variable, monospace'
const GAP = 8

/* ─── component ────────────────────────────────────────── */
export function ReviewView() {
  const stats = useWeeklyStats()
  const scores = useScoreStats()
  const habitRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  // Live clock
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Cell size from ResizeObserver
  const gridRef = useRef<HTMLDivElement>(null)
  const [cell, setCell] = useState(80)
  useEffect(() => {
    const update = () => {
      if (!gridRef.current) return
      // 4 cols, 3 gaps between them
      setCell(Math.floor((gridRef.current.offsetWidth - GAP * 3) / 4))
    }
    update()
    const ro = new ResizeObserver(update)
    if (gridRef.current) ro.observe(gridRef.current)
    return () => ro.disconnect()
  }, [])

  // Data
  const [backlog, setBacklog] = useState<Todo[]>([])
  const [allLogs, setAllLogs] = useState<HabitLog[]>([])
  const [weekDone, setWeekDone] = useState(0)
  const [weekTotal, setWeekTotal] = useState(0)
  const [showBacklog, setShowBacklog] = useState(false)

  useEffect(() => {
    void (async () => {
      // Backlog
      const all = await db.todos.filter(t => !t.completedAt && !t.cancelledAt).toArray()
      all.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return a.createdAt.localeCompare(b.createdAt)
      })
      setBacklog(all)

      // Habit logs
      const logs = await db.habitLogs.toArray()
      setAllLogs(logs)

      // Weekly todo rate
      const now = nowInTz()
      const startDate = dateKey(addDays(now, -6))
      const endDate = dateKey(now)
      const weekTodos = await db.todos
        .filter(t => {
          if (t.cancelledAt) return false
          const hasDue = t.dueDate ? (t.dueDate >= startDate && t.dueDate <= endDate) : false
          const hasSched = t.scheduledAt
            ? (() => { const d = dateKey(new Date(t.scheduledAt!)); return d >= startDate && d <= endDate })()
            : false
          return hasDue || hasSched
        })
        .toArray()

      let done = 0, total = 0
      for (let i = 0; i < 7; i++) {
        const dk = dateKey(addDays(now, -i))
        const day = weekTodos.filter(t =>
          t.dueDate === dk ||
          (t.scheduledAt ? dateKey(new Date(t.scheduledAt)) === dk : false),
        )
        total += day.length
        done += day.filter(t => !!t.completedAt).length
      }
      setWeekDone(done)
      setWeekTotal(total)
    })()
  }, [])

  const streak = useMemo(() => calcStreak(allLogs), [allLogs])
  const taskRate = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0

  // Time strings
  const hh = p2(clock.getHours())
  const mm = p2(clock.getMinutes())
  const dateStr = `${DAY[clock.getDay()]}, ${clock.getDate()} ${MON[clock.getMonth()]}`

  // Derived sizes
  // 1-cell height = cell px
  // 2-cell height = 2*cell + 1 gap
  const h1 = cell
  const h2 = cell * 2 + GAP

  /* ── BACKLOG VIEW ── */
  if (showBacklog) {
    const fmtDate = (d?: string) => {
      if (!d) return '—'
      const [y, m, day] = d.split('-')
      return `${parseInt(day, 10)} ${MON[parseInt(m, 10) - 1]} ${y}`
    }
    return (
      <div style={{ paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => setShowBacklog(false)}
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          ← KEMBALI
        </button>
        <h1 style={{ marginTop: 12, fontFamily: SANS, fontSize: 24, fontWeight: 600, color: 'var(--color-text)' }}>Backlog</h1>
        <p style={{ marginTop: 4, fontFamily: MONO, fontSize: 11, color: 'var(--color-text-muted)' }}>
          {backlog.length === 0 ? 'Semua bersih ✓' : `${backlog.length} tugas belum selesai`}
        </p>
        {backlog.length === 0 ? (
          <p style={{ padding: '48px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: '0.15em', color: 'var(--color-text-muted)' }}>
            TIDAK ADA BACKLOG
          </p>
        ) : (
          <ul style={{ marginTop: 16 }}>
            {backlog.map(todo => (
              <li key={todo.id} className="list-row">
                <button
                  type="button"
                  onClick={async () => {
                    await completeTodo(todo.id)
                    setBacklog(p => p.filter(t => t.id !== todo.id))
                  }}
                  className="check-circle shrink-0"
                  aria-label="Selesaikan"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: 'var(--color-text)' }}>{todo.title}</p>
                  <p style={{ marginTop: 2, fontFamily: MONO, fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {fmtDate(todo.dueDate)}{todo.priority ? ' · PRIORITAS' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  /* ── NOTHING UI GRID ── */
  return (
    <div
      ref={gridRef}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridAutoRows: `${cell}px`,
        gap: GAP,
        paddingBottom: 16,
      }}
    >
      {/* ════════════════════════════════════════════
          1. TANGGAL + JAM — col 1-2, row 1-2 (2×2)
             Shape: Rounded Rectangle
          ════════════════════════════════════════════ */}
      <div
        style={{
          gridColumn: '1 / 3',
          gridRow: '1 / 3',
          borderRadius: 24,
          background: '#111111',
          border: '1px solid #1e1e1e',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: h2,
          boxSizing: 'border-box',
        }}
      >
        {/* Date label */}
        <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', margin: 0 }}>
          {dateStr}
        </p>
        {/* Stacked HH / MM — big mono */}
        <div style={{ lineHeight: 0.88 }}>
          <p style={{ fontFamily: PIXEL, fontWeight: 300, fontSize: Math.floor(cell * 0.62), color: '#ffffff', margin: 0, letterSpacing: '-0.04em' }}>
            {hh}
          </p>
          <p style={{ fontFamily: PIXEL, fontWeight: 300, fontSize: Math.floor(cell * 0.62), color: '#ffffff', margin: 0, letterSpacing: '-0.04em' }}>
            {mm}
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          2. TUGAS % — col 3-4, row 1 (2×1)
             Shape: Pill — WHITE
          ════════════════════════════════════════════ */}
      <div
        style={{
          gridColumn: '3 / 5',
          gridRow: '1 / 2',
          borderRadius: 9999,
          background: '#ffffff',
          height: h1,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)' }}>
          TUGAS
        </span>
        <span style={{ fontFamily: PIXEL, fontWeight: 700, fontSize: Math.floor(cell * 0.36), color: '#000000', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {taskRate}%
        </span>
      </div>

      {/* ════════════════════════════════════════════
          3. HABIT % — col 3-4, row 2 (2×1)
             Shape: Pill — DARK
          ════════════════════════════════════════════ */}
      <div
        style={{
          gridColumn: '3 / 5',
          gridRow: '2 / 3',
          borderRadius: 9999,
          background: '#1c1c1c',
          border: '1px solid #2a2a2a',
          height: h1,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
          HABIT
        </span>
        <span style={{ fontFamily: PIXEL, fontWeight: 700, fontSize: Math.floor(cell * 0.36), color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {habitRate}%
        </span>
      </div>

      {/* ════════════════════════════════════════════
          4. STREAK — col 1-2, row 3-4 (2×2)
             Shape: CIRCLE — RED
          ════════════════════════════════════════════ */}
      <div
        style={{
          gridColumn: '1 / 3',
          gridRow: '3 / 5',
          borderRadius: 9999,
          background: '#d71921',
          height: h2,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          STREAK
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontFamily: PIXEL, fontWeight: 300, fontSize: Math.floor(cell * 0.62), color: '#ffffff', lineHeight: 0.95, letterSpacing: '-0.04em', margin: 0 }}>
            {streak}
          </p>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          HARI
        </span>
      </div>

      {/* ════════════════════════════════════════════
          5. SKOR HARI INI — col 3-4, row 3-4 (2×2)
             Shape: Rounded Rect — DARK
             Typography: Geist SANS bold (berbeda!)
          ════════════════════════════════════════════ */}
      <div
        style={{
          gridColumn: '3 / 5',
          gridRow: '3 / 5',
          borderRadius: 24,
          background: '#0d0d0d',
          border: '1px solid #1e1e1e',
          padding: '14px 16px',
          height: h2,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
          HARI INI
        </span>
        {/* Geist SANS — typography beda dari widget lain */}
        <span style={{ fontFamily: PIXEL, fontWeight: 800, fontSize: Math.floor(cell * 0.8), color: '#ffffff', lineHeight: 1, letterSpacing: '-0.05em' }}>
          {scores.today}
        </span>
      </div>

      {/* ════════════════════════════════════════════
          6. BACKLOG — col 1-2, row 5-6 (2×2)
             Shape: Rounded Rect
             Color: WHITE if >0, DARK if 0
             Typography: Geist SANS bold (berbeda!)
          ════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={() => setShowBacklog(true)}
        style={{
          gridColumn: '1 / 3',
          gridRow: '5 / 7',
          borderRadius: 24,
          background: backlog.length > 0 ? '#ffffff' : '#111111',
          border: `1px solid ${backlog.length > 0 ? 'rgba(0,0,0,0.07)' : '#1e1e1e'}`,
          padding: '14px 16px',
          height: h2,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: backlog.length > 0 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.3)',
        }}>
          BACKLOG
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {/* Geist SANS — same typography class as SKOR HARI INI */}
          <span style={{ fontFamily: PIXEL, fontWeight: 800, fontSize: Math.floor(cell * 0.8), color: backlog.length > 0 ? '#000000' : '#ffffff', lineHeight: 1, letterSpacing: '-0.05em' }}>
            {backlog.length}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: backlog.length > 0 ? '#000000' : '#ffffff', transform: 'translateY(-2px)' }}>
            <rect width="20" height="12" x="2" y="6" rx="2"/>
            <path d="M12 12h.01"/>
            <path d="M17 12h.01"/>
            <path d="M7 12h.01"/>
          </svg>
        </div>
      </button>

      {/* ════════════════════════════════════════════
          7. MINGGU — col 3-4, row 5 (2×1)
             Shape: Pill — DARK
          ════════════════════════════════════════════ */}
      <div
        style={{
          gridColumn: '3 / 5',
          gridRow: '5 / 6',
          borderRadius: 9999,
          background: '#111111',
          border: '1px solid #1e1e1e',
          height: h1,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
          MINGGU
        </span>
        <span style={{ fontFamily: PIXEL, fontWeight: 500, fontSize: Math.floor(cell * 0.36), color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {scores.week}
        </span>
      </div>

      {/* ════════════════════════════════════════════
          8. BULAN — col 3-4, row 6 (2×1)
             Shape: Pill — DARKER
          ════════════════════════════════════════════ */}
      <div
        style={{
          gridColumn: '3 / 5',
          gridRow: '6 / 7',
          borderRadius: 9999,
          background: '#0d0d0d',
          border: '1px solid #1e1e1e',
          height: h1,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
          BULAN
        </span>
        <span style={{ fontFamily: PIXEL, fontWeight: 500, fontSize: Math.floor(cell * 0.36), color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {scores.month}
        </span>
      </div>
    </div>
  )
}
