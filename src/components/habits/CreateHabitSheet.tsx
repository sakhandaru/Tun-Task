import { useState } from 'react'
import { db } from '../../lib/db/schema'
const scheduleSync = () => {}
import type { Weekday, HabitSchedule } from '../../lib/db/types'

interface CreateHabitSheetProps {
  open: boolean
  onClose: () => void
}

const WEEKDAYS = [
  { label: 'MIN', value: 0 },
  { label: 'SEN', value: 1 },
  { label: 'SEL', value: 2 },
  { label: 'RAB', value: 3 },
  { label: 'KAM', value: 4 },
  { label: 'JUM', value: 5 },
  { label: 'SAB', value: 6 },
]

const SCHEDULE_OPTS = [
  { label: 'HARIAN', value: 'daily', desc: 'Setiap hari' },
  { label: 'MINGGUAN', value: 'weekdays', desc: 'Hari tertentu' },
  { label: 'BULANAN', value: 'monthly', desc: 'Tanggal tertentu' },
  { label: 'INTERVAL', value: 'interval', desc: 'Setiap N hari' },
] as const

const MONO = 'Geist Mono Variable, ui-monospace, monospace'
const SANS = 'Geist Variable, system-ui, sans-serif'

export function CreateHabitSheet({ open, onClose }: CreateHabitSheetProps) {
  const [title, setTitle] = useState('')
  const [scheduleKind, setScheduleKind] = useState<'daily' | 'weekdays' | 'monthly' | 'interval'>('daily')
  const [selectedDays, setSelectedDays] = useState<Weekday[]>([])
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [intervalDays, setIntervalDays] = useState<number>(4)
  const [error, setError] = useState('')

  if (!open) return null

  const handleToggleDay = (day: Weekday) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanTitle = title.trim()
    if (!cleanTitle) { setError('Nama habit harus diisi'); return }

    let schedule: HabitSchedule = { kind: 'daily' }

    if (scheduleKind === 'weekdays') {
      if (selectedDays.length === 0) { setError('Pilih minimal satu hari'); return }
      schedule = { kind: 'weekdays', days: selectedDays }
    } else if (scheduleKind === 'monthly') {
      const p = Math.floor(dayOfMonth)
      if (isNaN(p) || p < 1 || p > 31) { setError('Tanggal harus 1–31'); return }
      schedule = { kind: 'monthly', dayOfMonth: p }
    } else if (scheduleKind === 'interval') {
      const p = Math.floor(intervalDays)
      if (isNaN(p) || p < 1) { setError('Interval harus lebih dari 0'); return }
      schedule = { kind: 'interval', intervalDays: p }
    }

    try {
      await db.habits.add({
        id: crypto.randomUUID(),
        title: cleanTitle,
        schedule,
        createdAt: new Date().toISOString(),
      })
      setTitle('')
      setScheduleKind('daily')
      setSelectedDays([])
      setDayOfMonth(1)
      setIntervalDays(4)
      scheduleSync()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan habit')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Sheet — slides up from bottom */}
      <div
        className="sheet-panel w-full max-h-[92dvh] overflow-y-auto"
        style={{
          background: 'var(--color-bg)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTop: '1px solid var(--color-border)',
          padding: '0 0 48px',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Buat Habit Baru"
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'var(--color-border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px 20px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              BUAT BARU
            </p>
            <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 600, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
              Habit
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              padding: '8px 0',
              cursor: 'pointer',
            }}
          >
            TUTUP
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ padding: '24px 24px 0' }}>

          {/* Error */}
          {error && (
            <div style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: 'var(--color-accent)',
              background: 'rgba(215,25,33,0.08)',
              border: '1px solid rgba(215,25,33,0.2)',
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* ── Nama Habit ── */}
          <div style={{ marginBottom: 28 }}>
            <label
              htmlFor="habit-title"
              style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 10 }}
            >
              NAMA HABIT
            </label>
            <input
              id="habit-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Olahraga, Minum air, Meditasi…"
              autoFocus
              style={{
                fontFamily: SANS,
                fontSize: 18,
                fontWeight: 400,
                width: '100%',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                padding: '8px 0 12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* ── Jenis Jadwal ── */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              JADWAL
            </p>
            {/* 4 pill options */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SCHEDULE_OPTS.map(opt => {
                const active = scheduleKind === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScheduleKind(opt.value)}
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '8px 16px',
                      borderRadius: 9999,
                      border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: active ? 'var(--color-accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Hari (weekdays) ── */}
          {scheduleKind === 'weekdays' && (
            <div style={{
              marginBottom: 24,
              padding: '16px',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
            }}>
              <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                HARI AKTIF
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {WEEKDAYS.map(day => {
                  const active = selectedDays.includes(day.value as Weekday)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleDay(day.value as Weekday)}
                      style={{
                        flex: 1,
                        fontFamily: MONO,
                        fontSize: 9,
                        letterSpacing: '0.08em',
                        padding: '10px 4px',
                        borderRadius: 10,
                        border: `1px solid ${active ? 'var(--color-text)' : 'var(--color-border)'}`,
                        background: active ? 'var(--color-text)' : 'transparent',
                        color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Tanggal (monthly) ── */}
          {scheduleKind === 'monthly' && (
            <div style={{
              marginBottom: 24,
              padding: '16px',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
            }}>
              <label
                htmlFor="habit-dom"
                style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 10 }}
              >
                TANGGAL SETIAP BULAN
              </label>
              <input
                id="habit-dom"
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(parseInt(e.target.value, 10))}
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  fontWeight: 300,
                  letterSpacing: '-0.02em',
                  width: 80,
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  padding: '4px 0 8px',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <p style={{ fontFamily: MONO, fontSize: 9, color: 'var(--color-text-muted)', marginTop: 8 }}>
                Habit muncul sekali sebulan pada tanggal ini
              </p>
            </div>
          )}

          {/* ── Interval ── */}
          {scheduleKind === 'interval' && (
            <div style={{
              marginBottom: 24,
              padding: '16px',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
            }}>
              <label
                htmlFor="habit-interval"
                style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 10 }}
              >
                ULANGI SETIAP
              </label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <input
                  id="habit-interval"
                  type="number"
                  min="1"
                  value={intervalDays}
                  onChange={e => setIntervalDays(parseInt(e.target.value, 10))}
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 300,
                    letterSpacing: '-0.02em',
                    width: 64,
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    padding: '4px 0 8px',
                    outline: 'none',
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
                  HARI SEKALI
                </span>
              </div>
            </div>
          )}

          {/* ── Submit ── */}
          <div style={{ paddingTop: 8 }}>
            <button
              type="submit"
              style={{
                width: '100%',
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 600,
                padding: '16px',
                borderRadius: 16,
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'opacity 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              SIMPAN HABIT
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
