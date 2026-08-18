import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { HabitMiniHeatmap } from '../../components/habits/HabitMiniHeatmap'
import { ChallengeModal } from '../../components/ChallengeModal'
import {
  useAllHabitLogs,
  useRoutines,
  useTodayHabits,
  useTodayTodos,
} from '../../hooks/useLiveDb'
import { formatDisplayTime, todayKey } from '../../lib/dates'
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
import { getGCalStatus, reconnectGCal, ensureAuth, type GCalStatus } from '../../lib/gcal'

interface TodayViewProps {
  onSelectHabit: (habit: Habit) => void
  onOpenSettings: () => void
}

function logStatus(logs: HabitLog[], habitId: string): HabitLog | undefined {
  return logs.find((l) => l.habitId === habitId)
}

/* ─── Font constants ──── */
const MONO = 'Geist Mono Variable, ui-monospace, monospace'

export function TodayView({ onSelectHabit, onOpenSettings }: TodayViewProps) {
  const todos = useTodayTodos()
  const { habits, logs } = useTodayHabits()
  const allLogs = useAllHabitLogs()
  const routines = useRoutines()
  const today = todayKey()

  // Live ticking clock state
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Format date and time
  const dateLabel = format(clock, 'EEE, d MMM', { locale: id })
  const hh = String(clock.getHours()).padStart(2, '0')
  const mm = String(clock.getMinutes()).padStart(2, '0')
  const ss = String(clock.getSeconds()).padStart(2, '0')
  const timeString = `${hh}:${mm}:${ss}`

  const [gcalStatus, setGcalStatus] = useState<GCalStatus>('disconnected')

  useEffect(() => {
    const updateStatus = () => setGcalStatus(getGCalStatus())
    updateStatus()
    window.addEventListener('gcal_auth_changed', updateStatus)
    const interval = setInterval(updateStatus, 20000)
    return () => {
      window.removeEventListener('gcal_auth_changed', updateStatus)
      clearInterval(interval)
    }
  }, [])

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

  const [toast, setToast] = useState<{ id: number; text: string; tone: 'plus' | 'minus' } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const toastCounter = useRef(0)
  const flash = (text: string, tone: 'plus' | 'minus') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastCounter.current += 1
    setToast({ id: toastCounter.current, text, tone })
    toastTimer.current = window.setTimeout(() => setToast(null), 900)
  }

  const handleSnooze = (todoId: string) => {
    setChallenge({
      open: true,
      title: 'Tunda Tugas?',
      description: 'Menunda tugas akan menumpuk beban Anda di hari esok.',
      onConfirm: () => void snoozeTodo(todoId),
    })
  }

  const handleSkipHabit = (habitId: string) => {
    setChallenge({
      open: true,
      title: 'Lewati Habit?',
      description: 'Konsistensi adalah kunci. Melewati hari ini berarti merusak momentum Anda.',
      onConfirm: () => {
        void skipHabit(habitId, today)
        flash('-5', 'minus')
      },
    })
  }

  const handleCancelTodo = (todoId: string) => {
    setChallenge({
      open: true,
      title: 'Batalkan Tugas?',
      description: 'Tugas ini akan dianggap tidak ada dan tidak mempengaruhi persentase progres.',
      onConfirm: () => {
        void cancelTodo(todoId)
        flash('-5', 'minus')
      },
    })
  }

  const handleRefreshClick = async () => {
    let shouldReload = true
    if (gcalStatus !== 'connected') {
      const status = getGCalStatus()
      if (status === 'expired') {
        const token = await ensureAuth()
        if (!token) {
          shouldReload = false
          await reconnectGCal()
        }
      } else {
        shouldReload = false
        await reconnectGCal()
      }
    }
    if (shouldReload) {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const r of registrations) await r.unregister()
        } catch (err) {
          console.error(err)
        }
      }
      window.location.reload()
    }
  }

  // Progress counts
  const todoDone = todos.filter((t) => !!t.completedAt).length
  const todoTotal = todos.length
  const habitDone = habits.filter((h) => logStatus(logs, h.id)?.status === 'done').length
  const habitTotal = habits.length

  return (
    <div className="pt-2 space-y-0">

      {/* ── HEADER ── */}
      <header className="flex items-start justify-between mb-6">
        <div>
          {/* Big date — Geist Pixel */}
          <h1 style={{
            fontFamily: 'GeistPixel Square, Geist Mono Variable, monospace',
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: 'var(--color-text)',
            margin: 0,
            lineHeight: 1,
          }}>
            {dateLabel}
          </h1>
          {/* Live digital clock — Geist Mono */}
          <h2 style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 11,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            margin: 0,
            marginTop: 6,
            lineHeight: 1,
          }}>
            {timeString}
          </h2>
        </div>

        {/* Buttons: GCal · Refresh · Settings */}
        <div className="flex items-center gap-1 mt-1">
          {/* GCal dot */}
          <button
            type="button"
            onClick={() => void reconnectGCal()}
            className="flex items-center justify-center p-2.5 relative transition-transform duration-200 active:scale-90"
            title={`Google Calendar: ${gcalStatus === 'connected' ? 'Tersambung' : gcalStatus === 'expired' ? 'Sesi Habis' : 'Terputus'}. Klik untuk hubungkan ulang.`}
            aria-label="Google Calendar Status"
          >
            <span className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              gcalStatus === 'connected'
                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]'
                : gcalStatus === 'expired'
                ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.7)] animate-pulse'
                : 'bg-[var(--color-accent)] shadow-[0_0_8px_rgba(215,25,33,0.7)]'
            }`} />
          </button>
          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefreshClick}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Hard Refresh"
            title="Force Reload & Update PWA"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M16 3h5v5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 21H3v-5" />
            </svg>
          </button>
          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Pengaturan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2v.44a2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2v-.44a2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── ROUTINES ── */}
      {routines.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {routines.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void loadRoutineItems(r.id)}
              className="chip"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      {/* ── TUGAS SECTION ── */}
      <section className="mb-8">
        {/* Section header with count */}
        <div className="flex items-center justify-between mb-3">
          <h2 style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}>
            TUGAS
          </h2>
          {todoTotal > 0 && (
            <span style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: todoDone === todoTotal ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}>
              {todoDone}/{todoTotal}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {todoTotal > 0 && (
          <div style={{
            height: 1,
            background: 'var(--color-border)',
            marginBottom: 0,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              width: `${(todoDone / todoTotal) * 100}%`,
              background: 'var(--color-accent)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        )}
        {todoTotal === 0 && <div className="divider" />}

        {todos.length === 0 ? (
          <p style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--color-text-muted)',
            padding: '24px 0',
            textTransform: 'uppercase',
          }}>
            Tidak ada tugas hari ini
          </p>
        ) : (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id} className="list-row group">
                <button
                  type="button"
                  onClick={() => {
                  if (todo.completedAt) {
                    void uncompleteTodo(todo.id)
                  } else {
                    void completeTodo(todo.id)
                    flash('+10', 'plus')
                  }
                }}
                  className={`check-circle shrink-0 ${todo.completedAt ? 'check-circle--done' : ''}`}
                  aria-label={todo.completedAt ? 'Batalkan' : 'Selesai'}
                />
                <div className="min-w-0 flex-1">
                  <p className={`leading-snug ${todo.priority ? 'font-semibold' : ''} ${
                    todo.completedAt ? 'line-through text-[var(--color-text-muted)]' : ''
                  }`} style={{ fontSize: 15 }}>
                    {todo.title}
                  </p>
                  <p style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    color: 'var(--color-text-muted)',
                    marginTop: 3,
                  }}>
                    {todo.scheduledAt ? formatDisplayTime(new Date(todo.scheduledAt)) : 'Hari ini'}
                    {todo.completedAt && ' · SELESAI'}
                  </p>
                </div>
                {!todo.completedAt && (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleCancelTodo(todo.id)}
                      style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-accent)', color: '#ffffff', border: 'none' }}
                      className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
                    >
                      BATAL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSnooze(todo.id)}
                      style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none' }}
                      className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
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

      {/* ── HABIT SECTION ── */}
      <section className="mb-8">
        {/* Section header with count */}
        <div className="flex items-center justify-between mb-3">
          <h2 style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}>
            HABIT
          </h2>
          {habitTotal > 0 && (
            <span style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: habitDone === habitTotal ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}>
              {habitDone}/{habitTotal}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {habitTotal > 0 && (
          <div style={{
            height: 1,
            background: 'var(--color-border)',
            marginBottom: 0,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              width: `${(habitDone / habitTotal) * 100}%`,
              background: 'var(--color-accent)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        )}
        {habitTotal === 0 && <div className="divider" />}

        {habits.length === 0 ? (
          <p style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--color-text-muted)',
            padding: '24px 0',
            textTransform: 'uppercase',
          }}>
            Tidak ada habit hari ini
          </p>
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
                    onClick={() => {
                    void toggleHabitDone(habit.id, today)
                    if (!done) flash('+10', 'plus')
                  }}
                    className={`check-circle shrink-0 ${done ? 'check-circle--done' : ''}`}
                    aria-label={done ? 'Batalkan' : 'Selesai'}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectHabit(habit)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className={`text-[15px] ${done ? 'text-[var(--color-text-muted)] line-through' : ''}`}>
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
                      style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none' }}
                      className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
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

      <AnimatePresence>
        {toast && (
          <div
            key={toast.id}
            style={{ position: 'fixed', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 90 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              style={{
                fontFamily: MONO,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '10px 18px',
                borderRadius: 9999,
                background: toast.tone === 'plus' ? '#ffffff' : 'var(--color-accent)',
                color: toast.tone === 'plus' ? '#000000' : '#ffffff',
                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              }}
            >
              {toast.text}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
