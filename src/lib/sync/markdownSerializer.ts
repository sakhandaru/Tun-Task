import type { Todo, Habit, HabitLog } from '../db/types'

// Helpers for timezone-aware date formatting
const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const formatTimeFromIso = (isoString: string): string => {
  const date = new Date(isoString)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function serializeTodos(todos: Todo[]): string {
  const active: string[] = []
  const completed: string[] = []
  const cancelled: string[] = []

  // Sort todos by dueDate / createdAt to maintain order
  const sortedTodos = [...todos].sort((a, b) => {
    const dateA = a.dueDate || a.createdAt
    const dateB = b.dueDate || b.createdAt
    return dateA.localeCompare(dateB)
  })

  for (const todo of sortedTodos) {
    const tags: string[] = []

    if (todo.dueDate) {
      tags.push(`📅 ${todo.dueDate}`)
    }
    if (todo.scheduledAt) {
      tags.push(`⏰ ${formatTimeFromIso(todo.scheduledAt)}`)
    }
    if (todo.priority) {
      tags.push('🔺')
    }

    const tagStr = tags.length > 0 ? ` ${tags.join(' ')}` : ''
    const idComment = ` <!-- id: ${todo.id} -->`

    if (todo.cancelledAt) {
      cancelled.push(`- [-] ${todo.title}${tagStr}${idComment}`)
    } else if (todo.completedAt) {
      const compDate = formatDate(new Date(todo.completedAt))
      completed.push(
        `- [x] ${todo.title}${tagStr} [completion:: ${compDate}]${idComment}`
      )
    } else {
      active.push(`- [ ] ${todo.title}${tagStr}${idComment}`)
    }
  }

  const lines = [
    '---',
    'type: tuntask-data',
    `last_sync: ${new Date().toISOString()}`,
    '---',
    '',
    '## Active',
    ...active,
    '',
    '## Completed',
    ...completed,
    '',
    '## Cancelled',
    ...cancelled,
    '',
  ]

  return lines.join('\n')
}

export function parseTodos(markdown: string): Todo[] {
  const todos: Todo[] = []
  const lines = markdown.split('\n')

  const taskRegex = /^\s*[-*]\s*\[([ x-])\]\s*(.*?)(?:\s*<!--\s*id:\s*([a-zA-Z0-9-]+)\s*-->)?\s*$/

  for (const line of lines) {
    const match = line.match(taskRegex)
    if (!match) continue

    const status = match[1]
    let rawText = match[2]
    const id = match[3] || crypto.randomUUID()

    // Extract metadata
    const dueMatch = rawText.match(/📅\s*(\d{4}-\d{2}-\d{2})/)
    const timeMatch = rawText.match(/⏰\s*(\d{2}:\d{2})/)
    const priorityMatch = rawText.includes('🔺')
    const completionMatch = rawText.match(/\[completion::\s*(\d{4}-\d{2}-\d{2})\]/)

    const dueDate = dueMatch ? dueMatch[1] : undefined
    const priority = priorityMatch ? true : undefined

    let scheduledAt: string | undefined
    if (timeMatch && dueDate) {
      // Build ISO string from dueDate and timeMatch
      const [h, m] = timeMatch[1].split(':').map(Number)
      const date = new Date(`${dueDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
      if (!isNaN(date.getTime())) {
        scheduledAt = date.toISOString()
      }
    }

    // Clean title by removing tags
    let title = rawText
      .replace(/📅\s*\d{4}-\d{2}-\d{2}/, '')
      .replace(/⏰\s*\d{2}:\d{2}/, '')
      .replace(/🔺/, '')
      .replace(/\[completion::\s*\d{4}-\d{2}-\d{2}\]/, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!title) title = 'Tugas Tanpa Nama'

    let completedAt: string | undefined
    let cancelledAt: string | undefined

    if (status === 'x') {
      completedAt = completionMatch
        ? new Date(`${completionMatch[1]}T12:00:00Z`).toISOString()
        : new Date().toISOString()
    } else if (status === '-') {
      cancelledAt = new Date().toISOString()
    }

    todos.push({
      id,
      title,
      dueDate,
      scheduledAt,
      completedAt,
      cancelledAt,
      createdAt: new Date().toISOString(),
      priority,
    })
  }

  return todos
}

export function serializeHabits(habits: Habit[], logs: HabitLog[]): string {
  const sections: string[] = [
    '---',
    'type: tuntask-data',
    `last_sync: ${new Date().toISOString()}`,
    '---',
    '',
    '## Habits',
  ]

  for (const habit of habits) {
    sections.push('', `### ${habit.title}`)

    // Filter logs for this specific habit
    const habitLogs = logs.filter((l) => l.habitId === habit.id)

    // Generate logs for last 30 days to keep the file concise
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = formatDate(d)

      const log = habitLogs.find((l) => l.date === dateStr)

      const repeatRule =
        habit.schedule.kind === 'daily'
          ? ' 🔁 every day'
          : ` 🔁 every week`

      if (log?.status === 'done') {
        sections.push(
          `- [x] 🌱 ${habit.title}${repeatRule} 📅 ${dateStr} [completion:: ${dateStr}] <!-- id: ${log.id} -->`
        )
      } else if (log?.status === 'skipped') {
        sections.push(
          `- [-] 🌱 ${habit.title}${repeatRule} 📅 ${dateStr} <!-- id: ${log.id} -->`
        )
      } else {
        // Uncompleted habit for this date
        sections.push(`- [ ] 🌱 ${habit.title}${repeatRule} 📅 ${dateStr}`)
      }
    }
  }

  sections.push('')
  return sections.join('\n')
}

export function parseHabits(
  markdown: string,
  existingHabits: Habit[]
): { logs: HabitLog[]; newHabits: Habit[] } {
  const logs: HabitLog[] = []
  const newHabits: Habit[] = []
  const lines = markdown.split('\n')

  let currentHabitTitle = ''
  let currentHabitId = ''

  const habitHeaderRegex = /^###\s+(.+)$/
  const logRegex = /^\s*[-*]\s*\[([ x-])\]\s*🌱\s*(.*?)\s*(?:📅\s*(\d{4}-\d{2}-\d{2}))?\s*(?:\[completion::\s*(\d{4}-\d{2}-\d{2})\])?(?:\s*<!--\s*id:\s*([a-zA-Z0-9-]+)\s*-->)?\s*$/

  for (const line of lines) {
    const headerMatch = line.match(habitHeaderRegex)
    if (headerMatch) {
      currentHabitTitle = headerMatch[1].trim()
      // Find if this habit already exists
      const match = existingHabits.find((h) => h.title === currentHabitTitle)
      if (match) {
        currentHabitId = match.id
      } else {
        // It's a new habit created in Obsidian!
        const newId = crypto.randomUUID()
        currentHabitId = newId
        newHabits.push({
          id: newId,
          title: currentHabitTitle,
          schedule: { kind: 'daily' },
          createdAt: new Date().toISOString(),
        })
      }
      continue
    }

    const logMatch = line.match(logRegex)
    if (logMatch && currentHabitId) {
      const status = logMatch[1]
      const date = logMatch[3] || formatDate(new Date())
      const id = logMatch[5] || crypto.randomUUID()

      if (status === 'x') {
        logs.push({
          id,
          habitId: currentHabitId,
          date,
          status: 'done',
        })
      } else if (status === '-') {
        logs.push({
          id,
          habitId: currentHabitId,
          date,
          status: 'skipped',
        })
      }
    }
  }

  return { logs, newHabits }
}
