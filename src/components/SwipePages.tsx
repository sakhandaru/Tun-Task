import { useCallback, useRef, useState, type ReactNode } from 'react'

interface SwipePagesProps {
  labels: string[]
  pages: ReactNode[]
  defaultIndex?: number
  onIndexChange?: (index: number) => void
}

export function SwipePages({
  labels,
  pages,
  defaultIndex = 0,
  onIndexChange,
}: SwipePagesProps) {
  const [index, setIndex] = useState(defaultIndex)
  const scrollRef = useRef<HTMLDivElement>(null)

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(i, pages.length - 1))
      setIndex(clamped)
      onIndexChange?.(clamped)
      const el = scrollRef.current
      if (el) {
        el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
      }
    },
    [pages.length, onIndexChange],
  )

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) {
      setIndex(i)
      onIndexChange?.(i)
    }
  }, [index, onIndexChange])

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex shrink-0 items-center justify-center gap-2 pt-4 pb-2">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => goTo(i)}
            className="flex flex-col items-center gap-1 px-3 py-1"
            aria-label={label}
            aria-current={index === i ? 'page' : undefined}
          >
            <span
              className={`font-mono text-[10px] tracking-widest uppercase transition ${
                index === i ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              {label}
            </span>
            <span
              className={`h-1 w-1 rounded-full transition ${
                index === i ? 'bg-[var(--color-accent)]' : 'bg-transparent'
              }`}
            />
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pages.map((page, i) => (
          <div
            key={labels[i]}
            className="h-full w-full shrink-0 snap-start overflow-y-auto px-4 pb-28"
          >
            {page}
          </div>
        ))}
      </div>
    </div>
  )
}
