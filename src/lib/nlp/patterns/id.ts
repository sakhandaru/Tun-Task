export const WEEKDAY_MAP: Record<string, number> = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export const HABIT_KEYWORDS = [
  'setiap',
  'tiap',
  'habit',
  'rutin',
  'every day',
  'everyday',
  'daily',
]

export const RELATIVE_DATE_PATTERNS: { pattern: RegExp; days: number }[] = [
  { pattern: /\b(hari ini|today)\b/i, days: 0 },
  { pattern: /\b(besok|tomorrow)\b/i, days: 1 },
  { pattern: /\b(lusa)\b/i, days: 2 },
  { pattern: /\b(minggu depan|next week)\b/i, days: 7 },
  { pattern: /\b(nanti)\b/i, days: 0 },
]

export const DATE_PATTERN = /\b(?:tanggal|tgl)\s*(\d{1,2})\b/i

export const TIME_OF_DAY: Record<string, string> = {
  subuh: '05:00',
  pagi: '07:00',
  siang: '12:00',
  sore: '16:00',
  malam: '19:00',
  'tengah malam': '23:59',
  morning: '07:00',
  afternoon: '12:00',
  evening: '17:00',
  night: '20:00',
}

export const TIME_MODIFIERS: Record<string, 'am' | 'pm'> = {
  pagi: 'am',
  subuh: 'am',
  siang: 'pm',
  sore: 'pm',
  malam: 'pm',
  'tengah malam': 'pm',
}

export const DAILY_PATTERNS = [
  /\b(setiap hari|tiap hari|every day|everyday|daily)\b/i,
]

export const WEEKDAY_LIST_PATTERN =
  /\b(?:setiap|tiap)?\s*((?:senin|selasa|rabu|kamis|jumat|sabtu|minggu)(?:\s*,?\s*(?:dan|&)?\s*)?)+\b/gi
