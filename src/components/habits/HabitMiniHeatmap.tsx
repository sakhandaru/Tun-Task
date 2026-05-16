import { heatmapCellClass } from '../../lib/habits/stats'
import type { DayStatus } from '../../lib/habits/stats'

interface HabitMiniHeatmapProps {
  days: { date: string; status: DayStatus }[]
}

export function HabitMiniHeatmap({ days }: HabitMiniHeatmapProps) {
  return (
    <div className="flex gap-0.5">
      {days.map((d) => (
        <div
          key={d.date}
          className={`heatmap-cell ${heatmapCellClass(d.status)}`}
          title={d.date}
        />
      ))}
    </div>
  )
}
