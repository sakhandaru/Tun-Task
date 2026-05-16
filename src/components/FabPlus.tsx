interface FabPlusProps {
  onClick: () => void
  hidden?: boolean
}

export function FabPlus({ onClick, hidden }: FabPlusProps) {
  if (hidden) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full shadow-lg transition active:scale-95"
      style={{
        background: 'var(--color-fab-bg)',
        color: 'var(--color-fab-text)',
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Tambah"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </button>
  )
}
