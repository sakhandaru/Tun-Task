import { addDays, format } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export const TZ = 'Asia/Jakarta'

export function nowInTz(): Date {
  return toZonedTime(new Date(), TZ)
}

export function todayKey(date: Date = new Date()): string {
  const zoned = toZonedTime(date, TZ)
  return format(zoned, 'yyyy-MM-dd')
}

export function dateKey(date: Date): string {
  const zoned = toZonedTime(date, TZ)
  return format(zoned, 'yyyy-MM-dd')
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return fromZonedTime(new Date(y, m - 1, d, 0, 0, 0), TZ)
}

export function addDaysInTz(date: Date, days: number): Date {
  return addDays(date, days)
}

export function formatDisplayDate(date: Date): string {
  const today = todayKey()
  const key = dateKey(date)
  if (key === today) return 'Hari ini'
  if (key === dateKey(addDaysInTz(nowInTz(), 1))) return 'Besok'
  if (key === dateKey(addDaysInTz(nowInTz(), 2))) return 'Lusa'
  return format(date, 'd MMM', { locale: undefined })
}

export function formatDisplayTime(date: Date): string {
  return format(date, 'HH:mm')
}
