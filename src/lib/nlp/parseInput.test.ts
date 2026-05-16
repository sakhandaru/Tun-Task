import { describe, expect, it } from 'vitest'
import { parseInput } from './parseInput'

describe('parseInput', () => {
  it('parses todo with tomorrow and time', () => {
    const r = parseInput('gym besok jam 7')
    expect(r.item?.type).toBe('todo')
    if (r.item?.type === 'todo') {
      expect(r.item.title.toLowerCase()).toContain('gym')
      expect(r.item.dueDate).toBeDefined()
    }
  })

  it('parses daily habit', () => {
    const r = parseInput('minum air 2L setiap hari')
    expect(r.item?.type).toBe('habit')
    if (r.item?.type === 'habit') {
      expect(r.item.schedule.kind).toBe('daily')
    }
  })

  it('parses habit via + prefix', () => {
    const r = parseInput('+ stretching')
    expect(r.item?.type).toBe('habit')
    if (r.item?.type === 'habit') {
      expect(r.item.title).toBe('stretching')
    }
  })

  it('parses weekday habit', () => {
    const r = parseInput('meditasi senin rabu jumat')
    expect(r.item?.type).toBe('habit')
    if (r.item?.type === 'habit' && r.item.schedule.kind === 'weekdays') {
      expect(r.item.schedule.days).toContain(1)
      expect(r.item.schedule.days).toContain(3)
      expect(r.item.schedule.days).toContain(5)
    }
  })

  it('parses priority todo', () => {
    const r = parseInput('!lapor kerja')
    expect(r.item?.type).toBe('todo')
    if (r.item?.type === 'todo') {
      expect(r.item.priority).toBe(true)
    }
  })

  it('returns null for empty', () => {
    expect(parseInput('').item).toBeNull()
  })
})
