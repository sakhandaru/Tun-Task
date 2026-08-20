import { useState, useMemo } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { useAllHabits } from '../../hooks/useLiveDb'
import { reorderHabits } from '../../lib/db/operations'
import type { Habit } from '../../lib/db/types'
import { DragHandle } from '../../components/DragHandle'

interface HabitsViewProps {
  onSelectHabit: (habit: Habit) => void
  onCreateHabit: () => void
}



function DraggableHabitRow({
  habit,
  onSelect,
}: {
  habit: Habit
  onSelect: (h: Habit) => void
}) {
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={habit}
      dragListener={false}
      dragControls={dragControls}
      className="list-row"
    >
      <button
        type="button"
        onClick={() => onSelect(habit)}
        className="flex flex-1 items-center justify-between text-left"
      >
        <span>
          <p className="font-medium text-[var(--color-text)]">{habit.title}</p>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)] uppercase">
            {habit.schedule.kind === 'daily' && 'SETIAP HARI'}
            {habit.schedule.kind === 'weekdays' && `${habit.schedule.days.length} HARI/MINGGU`}
            {habit.schedule.kind === 'monthly' && `SETIAP TANGGAL ${habit.schedule.dayOfMonth}`}
            {habit.schedule.kind === 'interval' && `SETIAP ${habit.schedule.intervalDays} HARI`}
          </p>
        </span>
        <span className="text-[var(--color-text-muted)]">›</span>
      </button>
      <DragHandle onStart={(e) => dragControls.start(e)} />
    </Reorder.Item>
  )
}

export function HabitsView({ onSelectHabit, onCreateHabit }: HabitsViewProps) {
  const habits = useAllHabits()
  const [habitIdsOrder, setHabitIdsOrder] = useState<string[] | null>(null)

  const orderedHabits = useMemo(() => {
    if (!habitIdsOrder) return habits
    if (habitIdsOrder.length !== habits.length) return habits
    const map = new Map(habits.map((h) => [h.id, h]))
    const next: Habit[] = []
    for (const id of habitIdsOrder) {
      const h = map.get(id)
      if (!h) return habits
      next.push(h)
    }
    return next
  }, [habitIdsOrder, habits])

  const handleReorder = (next: Habit[]) => {
    const nextIds = next.map((h) => h.id)
    setHabitIdsOrder(nextIds)
    void reorderHabits(nextIds)
  }

  return (
    <div className="space-y-6 pt-2">
      <header className="flex items-start justify-between">
        <div>
          <h1 style={{
            fontFamily: 'GeistPixel Square, Geist Mono Variable, monospace',
            fontSize: 30,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: 'var(--color-text)',
            margin: 0,
            lineHeight: 1,
          }}>
            HABIT
          </h1>
          <p style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 9,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            marginTop: 6,
          }}>
            Ketuk untuk kalender & grafik
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateHabit}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest transition-all active:scale-95"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
          aria-label="Buat Habit Baru"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          BARU
        </button>
      </header>

      {orderedHabits.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Belum ada habit aktif.</p>
      ) : (
        <Reorder.Group
          as="ul"
          axis="y"
          values={orderedHabits}
          onReorder={handleReorder}
        >
          {orderedHabits.map((habit) => (
            <DraggableHabitRow
              key={habit.id}
              habit={habit}
              onSelect={onSelectHabit}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  )
}