interface DragHandleProps {
  onStart: (e: React.PointerEvent) => void
}

export function DragHandle({ onStart }: DragHandleProps) {
  return (
    <button
      type="button"
      onPointerDown={onStart}
      className="drag-handle shrink-0"
      aria-label="Urutkan"
      title="Geser untuk mengurutkan"
    >
      <svg width="14" height="18" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">
        <circle cx="3" cy="3" r="1.1" />
        <circle cx="9" cy="3" r="1.1" />
        <circle cx="3" cy="9" r="1.1" />
        <circle cx="9" cy="9" r="1.1" />
        <circle cx="3" cy="15" r="1.1" />
        <circle cx="9" cy="15" r="1.1" />
      </svg>
    </button>
  )
}