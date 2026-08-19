import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { useLiveQuery } from 'dexie-react-hooks'
import { useWeeklyStats, useScoreStats, useCompletedTodosInRange } from '../../hooks/useLiveDb'
import { db } from '../../lib/db/schema'
import { completeTodo } from '../../lib/db/operations'
import { dateKey, TZ } from '../../lib/dates'
import type { HabitLog } from '../../lib/db/types'

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
  const [showBacklog, setShowBacklog] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [openPeriod, setOpenPeriod] = useState<'week' | 'month' | null>(null)

  // Reactive Backlog query
  const backlog = useLiveQuery(async () => {
    const all = await db.todos.filter(t => !t.completedAt && !t.cancelledAt).toArray()
    all.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })
    return all
  }) ?? []

  // Reactive Habit Logs query
  const allLogs = useLiveQuery(() => db.habitLogs.toArray()) ?? []

  // Reactive Weekly Completed Tasks query
  const weekDone = useLiveQuery(async () => {
    const now = new Date()
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

    let done = 0
    for (let i = 0; i < 7; i++) {
      const dk = dateKey(addDays(now, -i))
      const day = weekTodos.filter(t =>
        t.dueDate === dk ||
        (t.scheduledAt ? dateKey(new Date(t.scheduledAt)) === dk : false),
      )
      done += day.filter(t => !!t.completedAt).length
    }
    return done
  }) ?? 0

  const streak = useMemo(() => calcStreak(allLogs), [allLogs])

  // Completed todos per period (for MINGGU / BULAN drill-down)
  const rawRangeNow = new Date()
  const zonedRangeNow = toZonedTime(rawRangeNow, TZ)
  const weekStart = dateKey(addDays(rawRangeNow, -6))
  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStart = `${zonedRangeNow.getFullYear()}-${pad(zonedRangeNow.getMonth() + 1)}-01`
  const todayK = dateKey(rawRangeNow)
  const weekCompleted = useCompletedTodosInRange(weekStart, todayK)
  const monthCompleted = useCompletedTodosInRange(monthStart, todayK)

  // Time strings
  const zonedClock = toZonedTime(clock, TZ)
  const hh = p2(zonedClock.getHours())
  const mm = p2(zonedClock.getMinutes())
  const dateStr = `${DAY[zonedClock.getDay()]}, ${zonedClock.getDate()} ${MON[zonedClock.getMonth()]}`

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

  /* ── BREAKDOWN VIEW ── */
  if (showBreakdown) {
    const b = scores.todayBreakdown
    const rows: { label: string; detail: string; value: number }[] = []
    if (b.habitDone > 0) rows.push({ label: 'HABIT SELESAI', detail: `\u00d7${b.habitDone}`, value: b.habitDone * 10 })
    if (b.todoOnTime > 0) rows.push({ label: 'TUGAS TEPAT WAKTU', detail: `\u00d7${b.todoOnTime}`, value: b.todoOnTime * 10 })
    if (b.todoLate > 0) rows.push({ label: 'TUGAS TELAT', detail: `\u00d7${b.todoLate}`, value: b.todoLate * 5 })
    if (b.perfect) rows.push({ label: 'PERFECT DAY', detail: '', value: 20 })
    if (b.skipped > 0) rows.push({ label: 'SKIP HABIT', detail: `\u00d7${b.skipped}`, value: -b.skipped * 5 })
    if (b.cancelled > 0) rows.push({ label: 'BATALKAN TUGAS', detail: `\u00d7${b.cancelled}`, value: -b.cancelled * 5 })

    return (
      <div style={{ paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => setShowBreakdown(false)}
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          ← KEMBALI
        </button>
        <h1 style={{ marginTop: 12, fontFamily: SANS, fontSize: 24, fontWeight: 600, color: 'var(--color-text)' }}>Rincian Skor</h1>
        <p style={{ marginTop: 4, marginBottom: 24, fontFamily: MONO, fontSize: 11, color: 'var(--color-text-muted)' }}>
          HARI INI · {scores.todayBreakdown.perfect ? 'PERFECT DAY' : 'AKTIVITAS'}
        </p>
        <ul>
          {rows.map((row) => (
            <li key={row.label} className="list-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, color: 'var(--color-text)' }}>{row.label}</p>
                {row.detail && (
                  <p style={{ marginTop: 2, fontFamily: MONO, fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {row.detail}
                  </p>
                )}
              </div>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: row.value >= 0 ? '#22c55e' : 'var(--color-accent)',
                }}
              >
                {row.value >= 0 ? `+${row.value}` : row.value}
              </span>
            </li>
          ))}
          {rows.length === 0 && (
            <p style={{ padding: '48px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: '0.15em', color: 'var(--color-text-muted)' }}>
              TIDAK ADA AKTIVITAS HARI INI
            </p>
          )}
        </ul>
        <div className="list-row" style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>TOTAL</p>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
            {scores.today}
          </span>
        </div>
      </div>
    )
  }

  /* ── PERIOD VIEW (MINGGU / BULAN) ── */
  if (openPeriod) {
    const isWeek = openPeriod === 'week'
    const items = isWeek ? weekCompleted : monthCompleted
    const total = isWeek ? scores.week : scores.month
    const rangeStart = isWeek ? weekStart : monthStart
    const periodHabitsDone = allLogs.filter(
      (l) => l.status === 'done' && l.date >= rangeStart && l.date <= todayK,
    ).length
    const fmtDate = (d?: string) => {
      if (!d) return '—'
      const parts = d.split('-')
      return `${parseInt(parts[2], 10)} ${MON[parseInt(parts[1], 10) - 1]}`
    }

    return (
      <div style={{ paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => setOpenPeriod(null)}
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          ← KEMBALI
        </button>
        <h1 style={{ marginTop: 12, fontFamily: SANS, fontSize: 24, fontWeight: 600, color: 'var(--color-text)' }}>
          {isWeek ? 'Minggu Ini' : 'Bulan Ini'}
        </h1>
        <p style={{ marginTop: 4, fontFamily: MONO, fontSize: 11, color: 'var(--color-text-muted)' }}>
          {isWeek ? '7 HARI TERAKHIR' : 'DARI TANGGAL 1'} · SKOR {total}
        </p>
        <p style={{ marginTop: 4, marginBottom: 16, fontFamily: MONO, fontSize: 11, color: 'var(--color-text-muted)' }}>
          HABIT SELESAI · {periodHabitsDone}
        </p>
        {items.length === 0 ? (
          <p style={{ padding: '48px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: '0.15em', color: 'var(--color-text-muted)' }}>
            BELUM ADA TUGAS DISELESAIKAN
          </p>
        ) : (
          <ul>
            {items.map((todo) => (
              <li key={todo.id} className="list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: 'var(--color-text)' }}>{todo.title}</p>
                  <p style={{ marginTop: 2, fontFamily: MONO, fontSize: 10, color: 'var(--color-text-muted)' }}>
                    DICENTANG {fmtDate(todo.completedKey)} · DUE {fmtDate(todo.dueDate)}
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
          {weekDone}
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
          {stats.done}
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
      <button
        type="button"
        onClick={() => setShowBreakdown(true)}
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
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
          HARI INI
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: PIXEL, fontWeight: 800, fontSize: Math.floor(cell * 0.8), color: '#ffffff', lineHeight: 1, letterSpacing: '-0.05em' }}>
            {scores.today}
          </span>
          {scores.todayBreakdown.perfect && (
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em', color: '#22c55e' }}>
              PERFECT
            </span>
          )}
        </div>
      </button>

      {/* ════════════════════════════════════════════
          6. BACKLOG — col 3-4, row 5-6 (2×2)
             Shape: Rounded Rect
             Color: WHITE if >0, DARK if 0
             Typography: Geist SANS bold (berbeda!)
          ════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={() => setShowBacklog(true)}
        style={{
          gridColumn: '3 / 5',
          gridRow: '5 / 7',
          borderRadius: 24,
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0,0,0,0.07)',
          padding: '14px 16px',
          height: h2,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      >
        <span style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(0,0,0,0.35)',
        }}>
          BACKLOG
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: PIXEL, fontWeight: 800, fontSize: Math.floor(cell * 0.8), color: '#000000', lineHeight: 1, letterSpacing: '-0.05em' }}>
            {backlog.length}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#000000', transform: 'translateY(-2px)' }}>
            <rect width="20" height="12" x="2" y="6" rx="2"/>
            <path d="M12 12h.01"/>
            <path d="M17 12h.01"/>
            <path d="M7 12h.01"/>
          </svg>
        </div>
      </button>

      {/* ════════════════════════════════════════════
          7. MINGGU — col 1-2, row 5 (2×1)
             Shape: Pill — DARK
          ════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={() => setOpenPeriod('week')}
        style={{
          gridColumn: '1 / 3',
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
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
          MINGGU
        </span>
        <span style={{ fontFamily: PIXEL, fontWeight: 500, fontSize: Math.floor(cell * 0.36), color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {scores.week}
        </span>
      </button>

      {/* ════════════════════════════════════════════
          8. BULAN — col 1-2, row 6 (2×1)
             Shape: Pill — DARKER
          ════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={() => setOpenPeriod('month')}
        style={{
          gridColumn: '1 / 3',
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
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
          BULAN
        </span>
        <span style={{ fontFamily: PIXEL, fontWeight: 500, fontSize: Math.floor(cell * 0.36), color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {scores.month}
        </span>
      </button>
    </div>
  )
}
