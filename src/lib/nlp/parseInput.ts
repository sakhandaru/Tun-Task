import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { dateKey, nowInTz, TZ } from '../dates'
import type { HabitSchedule, Weekday } from '../db/types'
import {
  DAILY_PATTERNS,
  DATE_PATTERN,
  HABIT_KEYWORDS,
  RELATIVE_DATE_PATTERNS,
  TIME_MODIFIERS,
  TIME_OF_DAY,
  WEEKDAY_LIST_PATTERN,
  WEEKDAY_MAP,
} from './patterns/id'
import type { ParsedItem, ParseResult } from './types'

function stripPatterns(text: string, patterns: RegExp[]): string {
  let result = text
  for (const p of patterns) {
    result = result.replace(p, ' ')
  }
  return result.replace(/\s+/g, ' ').trim()
}

function extractWeekdays(text: string): { days: Weekday[]; cleaned: string } {
  const days = new Set<Weekday>()
  let cleaned = text

  const matches = [...text.matchAll(WEEKDAY_LIST_PATTERN)]
  for (const match of matches) {
    const segment = match[0].toLowerCase()
    for (const [name, day] of Object.entries(WEEKDAY_MAP)) {
      if (segment.includes(name)) {
        days.add(day as Weekday)
        cleaned = cleaned.replace(new RegExp(`\\b${name}\\b`, 'gi'), ' ')
      }
    }
    cleaned = cleaned.replace(/\b(setiap|tiap|dan|&|,)\b/gi, ' ')
  }

  return { days: [...days].sort() as Weekday[], cleaned: cleaned.replace(/\s+/g, ' ').trim() }
}

function extractTime(text: string): { time?: string; cleaned: string } {
  let cleaned = text
  let time: string | undefined
  let modifier: 'am' | 'pm' | undefined

  // Detect modifiers first
  for (const [word, mod] of Object.entries(TIME_MODIFIERS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      modifier = mod
      break
    }
  }

  const jamMatch = text.match(/\bjam\s*(\d{1,2})(?:[.:](\d{2}))?\b/i)
  if (jamMatch) {
    let h = parseInt(jamMatch[1], 10)
    const m = (jamMatch[2] ?? '00').padStart(2, '0')
    
    if (modifier === 'pm' && h < 12) h += 12
    if (modifier === 'am' && h === 12) h = 0
    
    time = `${h.toString().padStart(2, '0')}:${m}`
    cleaned = cleaned.replace(jamMatch[0], ' ')
  }

  const clockMatch = text.match(/\b(\d{1,2})[.:](\d{2})\b/)
  if (!time && clockMatch) {
    let h = parseInt(clockMatch[1], 10)
    const m = clockMatch[2]
    
    if (modifier === 'pm' && h < 12) h += 12
    if (modifier === 'am' && h === 12) h = 0

    time = `${h.toString().padStart(2, '0')}:${m}`
    cleaned = cleaned.replace(clockMatch[0], ' ')
  }

  // Use default time for keywords if no specific time was found
  for (const [word, t] of Object.entries(TIME_OF_DAY)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      time = time ?? t
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ')
    }
  }

  return { time, cleaned: cleaned.replace(/\s+/g, ' ').trim() }
}

function extractFixedDate(text: string): { date?: Date; cleaned: string } {
  let cleaned = text
  let date: Date | undefined
  const now = nowInTz()
  const currentDay = now.getDate()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const match = text.match(DATE_PATTERN)
  if (match) {
    const targetDay = parseInt(match[1], 10)
    if (targetDay >= 1 && targetDay <= 31) {
      date = new Date(currentYear, currentMonth, targetDay)
      // If the date has already passed this month, move to next month
      if (targetDay < currentDay) {
        date.setMonth(currentMonth + 1)
      }
      cleaned = cleaned.replace(match[0], ' ')
    }
  }

  return { date, cleaned: cleaned.replace(/\s+/g, ' ').trim() }
}

function extractRelativeDate(text: string): { date?: Date; cleaned: string } {
  let cleaned = text
  let date: Date | undefined
  const base = startOfDay(nowInTz())

  for (const { pattern, days } of RELATIVE_DATE_PATTERNS) {
    if (pattern.test(text)) {
      date = addDays(base, days)
      cleaned = cleaned.replace(pattern, ' ')
      break
    }
  }

  return { date, cleaned: cleaned.replace(/\s+/g, ' ').trim() }
}

function buildScheduledIso(date: Date, time?: string): { dueDate: string; scheduledAt?: string } {
  const dueDate = dateKey(date)
  if (!time) return { dueDate }

  const [h, m] = time.split(':').map(Number)
  const local = setMinutes(setHours(date, h), m)
  return { dueDate, scheduledAt: fromZonedTime(local, TZ).toISOString() }
}

function buildPreview(item: ParsedItem): string {
  if (item.type === 'habit') {
    const sched =
      item.schedule.kind === 'daily'
        ? 'setiap hari'
        : `hari terpilih`
    const time = item.reminderTime ? ` · ${item.reminderTime}` : ''
    return `Habit · ${sched}${time} · "${item.title}"`
  }
  const parts = ['Todo']
  if (item.dueDate) parts.push(item.dueDate)
  if (item.scheduledAt) {
    const d = new Date(item.scheduledAt)
    parts.push(d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TZ }))
  }
  if (item.priority) parts.push('prioritas')
  parts.push(`"${item.title}"`)
  return parts.join(' · ')
}

export function parseInput(raw: string): ParseResult {
  const trimmed = raw.trim()
  if (!trimmed) return { item: null, preview: '', raw: trimmed }

  let text = trimmed
  const forceHabit = text.startsWith('+')
  const priority = text.startsWith('!')
  if (forceHabit || priority) text = text.slice(1).trim()

  const lower = text.toLowerCase()
  const hasHabitKeyword = HABIT_KEYWORDS.some((k) => lower.includes(k))
  const isDaily = DAILY_PATTERNS.some((p) => p.test(text))

  const { time, cleaned: t1 } = extractTime(text)
  const { date: d1, cleaned: t2a } = extractFixedDate(t1)
  const { date: d2, cleaned: t2b } = extractRelativeDate(t2a)
  const { days, cleaned: t3 } = extractWeekdays(t2b)

  const date = d1 || d2

  let schedule: HabitSchedule | undefined
  if (isDaily) schedule = { kind: 'daily' }
  else if (days.length > 0) schedule = { kind: 'weekdays', days }

  const patternsToStrip = [
    ...DAILY_PATTERNS,
    ...HABIT_KEYWORDS.map((k) => new RegExp(`\\b${k}\\b`, 'gi')),
  ]
  let title = stripPatterns(t3, patternsToStrip)
  if (!title) title = trimmed.replace(/^[+!]\s*/, '').trim()

  const dateInfo: { dueDate?: string; scheduledAt?: string } = date
    ? buildScheduledIso(date, time)
    : time
      ? buildScheduledIso(startOfDay(nowInTz()), time)
      : {}

  const shouldBeHabit = forceHabit || hasHabitKeyword || isDaily || days.length > 0

  const projectMatch = title.match(/\[\[(.*?)\]\]/)
  const project = projectMatch ? projectMatch[1] : undefined

  let item: ParsedItem | null = null

  if (shouldBeHabit && title) {
    item = {
      type: 'habit',
      title,
      schedule: schedule ?? { kind: 'daily' },
      reminderTime: time,
      confidence: schedule || forceHabit ? 'high' : 'low',
    }
  } else if (title) {
    item = {
      type: 'todo',
      title,
      dueDate: dateInfo.dueDate,
      scheduledAt: dateInfo.scheduledAt,
      priority,
      project,
      confidence: dateInfo.dueDate ? 'high' : 'low',
    }
  }

  return {
    item,
    preview: item ? buildPreview(item) : 'Ketik sesuatu…',
    raw: trimmed,
  }
}
