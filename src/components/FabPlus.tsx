interface FabPlusProps {
  onClick: () => void
  hidden?: boolean
}

export function FabPlus({ onClick, hidden }: FabPlusProps) {
  if (hidden) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 bg-[#1c1c1c] p-2 rounded-full border-2 border-[#3a3a3a] shadow-[0_16px_32px_rgba(0,0,0,0.8)]"
      style={{
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Tombol Tambah (+) - Bulat Putih */}
      <button
        type="button"
        onClick={onClick}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffffff] text-[#000000] transition active:scale-95 hover:opacity-95 cursor-pointer"
        aria-label="Tambah Cepat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {/* Tombol Navigasi Review (-) - Bulat Merah */}
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('swipe_to_page', { detail: { index: 3 } }))
        }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d71921] text-[#ffffff] transition active:scale-95 hover:opacity-95 cursor-pointer"
        aria-label="Buka Review"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
