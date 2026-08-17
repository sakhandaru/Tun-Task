import { useState } from 'react'
import { db } from '../../lib/db/schema'
import { scheduleSync } from '../../lib/sync/syncManager'
import { useRefresh } from '../../context/RefreshContext'
import type { Weekday, HabitSchedule } from '../../lib/db/types'

interface CreateHabitSheetProps {
  open: boolean
  onClose: () => void
}

const WEEKDAYS = [
  { label: 'Min', value: 0 },
  { label: 'Sen', value: 1 },
  { label: 'Sel', value: 2 },
  { label: 'Rab', value: 3 },
  { label: 'Kam', value: 4 },
  { label: 'Jum', value: 5 },
  { label: 'Sab', value: 6 },
]

export function CreateHabitSheet({ open, onClose }: CreateHabitSheetProps) {
  const { refresh } = useRefresh()
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
    if (!cleanTitle) {
      setError('Nama habit harus diisi')
      return
    }

    let schedule: HabitSchedule = { kind: 'daily' }

    if (scheduleKind === 'weekdays') {
      if (selectedDays.length === 0) {
        setError('Pilih minimal satu hari dalam seminggu')
        return
      }
      schedule = { kind: 'weekdays', days: selectedDays }
    } else if (scheduleKind === 'monthly') {
      const parsedDay = Math.floor(dayOfMonth)
      if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        setError('Tanggal bulanan harus di antara 1 sampai 31')
        return
      }
      schedule = { kind: 'monthly', dayOfMonth: parsedDay }
    } else if (scheduleKind === 'interval') {
      const parsedInterval = Math.floor(intervalDays)
      if (isNaN(parsedInterval) || parsedInterval < 1) {
        setError('Interval hari harus lebih besar dari 0')
        return
      }
      schedule = { kind: 'interval', intervalDays: parsedInterval }
    }

    try {
      await db.habits.add({
        id: crypto.randomUUID(),
        title: cleanTitle,
        schedule,
        createdAt: new Date().toISOString(),
      })

      // Reset Form
      setTitle('')
      setScheduleKind('daily')
      setSelectedDays([])
      setDayOfMonth(1)
      setIntervalDays(4)

      scheduleSync()
      refresh()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan habit ke database')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto bg-[var(--color-bg)] rounded-3xl border border-[var(--color-border)] p-6 shadow-2xl transition-transform duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
            🎯 Buat Habit Baru
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 font-mono text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            TUTUP
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <p className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 rounded-lg">
              ⚠️ {error}
            </p>
          )}

          {/* Nama Habit */}
          <div className="space-y-1.5">
            <label htmlFor="habit-title" className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase">
              Nama Habit
            </label>
            <input
              id="habit-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Minum Air, Olahraga"
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              autoFocus
            />
          </div>

          {/* Tipe Penjadwalan */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase">
              Jenis Penjadwalan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '📅 Harian', value: 'daily' },
                { label: '🗓️ Mingguan', value: 'weekdays' },
                { label: '🌕 Bulanan', value: 'monthly' },
                { label: '🔁 Kustom Interval', value: 'interval' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setScheduleKind(opt.value as any)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    scheduleKind === opt.value
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-bg)]'
                      : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Detil Jadwal berdasarkan tipe */}
          {scheduleKind === 'weekdays' && (
            <div className="space-y-2 p-4 bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-2xl">
              <span className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase block mb-1">
                Hari dalam Seminggu
              </span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(day => {
                  const active = selectedDays.includes(day.value as Weekday)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleDay(day.value as Weekday)}
                      className={`flex-1 min-w-[50px] py-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                        active
                          ? 'bg-[var(--color-text)] border-[var(--color-text)] text-[var(--color-bg)]'
                          : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {scheduleKind === 'monthly' && (
            <div className="space-y-1.5 p-4 bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-2xl">
              <label htmlFor="habit-dom" className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase block">
                Tanggal Setiap Bulan
              </label>
              <input
                id="habit-dom"
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(parseInt(e.target.value, 10))}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <span className="text-[10px] text-[var(--color-text-muted)] block mt-1">
                * Habit ini hanya akan muncul sekali sebulan pada tanggal yang dipilih.
              </span>
            </div>
          )}

          {scheduleKind === 'interval' && (
            <div className="space-y-1.5 p-4 bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-2xl">
              <label htmlFor="habit-interval" className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase block">
                Ulangi Setiap (N) Hari
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="habit-interval"
                  type="number"
                  min="1"
                  value={intervalDays}
                  onChange={e => setIntervalDays(parseInt(e.target.value, 10))}
                  className="w-24 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-accent)]"
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  Hari Sekali (Contoh: 4 = Setiap 4 hari sekali)
                </span>
              </div>
            </div>
          )}

          {/* Tombol Simpan */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-[var(--color-accent)] text-[var(--color-bg)] py-3.5 rounded-xl text-sm font-semibold tracking-wide hover:opacity-95 transition-all shadow-md active:scale-[0.98]"
            >
              Simpan Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
