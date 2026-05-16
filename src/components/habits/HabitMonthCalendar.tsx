import type { MonthDay } from '../../lib/habits/stats'
import { formatMonthYear } from '../../lib/habits/stats'

interface HabitMonthCalendarProps {
  year: number
  month: number
  days: MonthDay[]
  strike: { completed: number; scheduled: number }
  onPrev: () => void
  onNext: () => void
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function cellStyle(status: MonthDay['status'], inMonth: boolean): string {
  if (!inMonth) return 'opacity-0 pointer-events-none'
  switch (status) {
    case 'done':
      return 'bg-[var(--color-accent)] text-white'
    case 'skipped':
      return 'bg-[var(--color-heatmap-2)] text-[var(--color-text)]'
    case 'missed':
      return 'border border-[var(--color-text-muted)] text-[var(--color-text-muted)]'
    case 'empty':
      return 'border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]'
    default:
      return 'text-transparent'
  }
}

export function HabitMonthCalendar({
  year,
  month,
  days,
  strike,
  onPrev,
  onNext,
}: HabitMonthCalendarProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onPrev} className="px-2 py-1 text-[var(--color-text-muted)]">
          ‹
        </button>
        <span className="font-mono text-xs tracking-wide uppercase">
          {formatMonthYear(year, month)}
        </span>
        <button type="button" onClick={onNext} className="px-2 py-1 text-[var(--color-text-muted)]">
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-center font-mono text-[9px] text-[var(--color-text-muted)]">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            className={`flex aspect-square items-center justify-center rounded-full text-[10px] font-medium ${cellStyle(day.status, day.inMonth)}`}
          >
            {day.inMonth ? day.dayOfMonth : ''}
          </div>
        ))}
      </div>

      <p className="mt-4 text-center font-mono text-xs text-[var(--color-text-muted)]">
        {strike.completed} dari {strike.scheduled} hari
      </p>
    </div>
  )
}
