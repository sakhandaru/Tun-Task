import type { ContributionCell, DayStatus } from '../../lib/habits/stats'
import { heatmapCellClass } from '../../lib/habits/stats'

interface HabitContributionGraphProps {
  cells: ContributionCell[]
}

const DAY_LABELS = ['Sen', '', 'Rab', '', 'Jum', '', 'Min']

function statusLabel(status: DayStatus): string {
  switch (status) {
    case 'done':
      return 'Selesai'
    case 'skipped':
      return 'Dilewati'
    case 'missed':
      return 'Terlewat'
    case 'empty':
      return 'Belum'
    default:
      return 'Tidak dijadwalkan'
  }
}

export function HabitContributionGraph({ cells }: HabitContributionGraphProps) {
  const weekCount = cells.length > 0 ? Math.max(...cells.map((c) => c.weekIndex)) + 1 : 0
  const weeks = Array.from({ length: weekCount }, (_, w) =>
    cells.filter((c) => c.weekIndex === w),
  )

  return (
    <div>
      <p className="section-label mb-3">12 minggu terakhir</p>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2">
          <div className="flex flex-col justify-between gap-[3px] py-0">
            {DAY_LABELS.map((label, i) => (
              <span
                key={i}
                className="h-[10px] font-mono text-[8px] leading-[10px] text-[var(--color-text-muted)]"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, di) => {
                  const cell = week.find((c) => c.dayIndex === di)
                  if (!cell) {
                    return <div key={di} className="heatmap-cell bg-transparent" />
                  }
                  return (
                    <div
                      key={cell.date}
                      className={`heatmap-cell ${heatmapCellClass(cell.status)}`}
                      title={`${cell.date}: ${statusLabel(cell.status)}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
