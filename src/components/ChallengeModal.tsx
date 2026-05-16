import { useState, useEffect } from 'react'

interface ChallengeModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  phrase: string
  title: string
  description: string
}

export function ChallengeModal({
  open,
  onClose,
  onConfirm,
  phrase,
  title,
  description,
}: ChallengeModalProps) {
  const [input, setInput] = useState('')

  useEffect(() => {
    if (open) setInput('')
  }, [open])

  if (!open) return null

  const handleConfirm = () => {
    if (input.trim().toUpperCase() === phrase.toUpperCase()) {
      onConfirm()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-6 shadow-2xl border border-[var(--color-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-red-500 mb-2 uppercase tracking-tight">{title}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6 leading-relaxed">
          {description}
        </p>

        <div className="mb-4">
          <p className="text-[10px] font-mono text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">
            Ketik kalimat berikut:
          </p>
          <p className="text-sm font-mono font-bold text-[var(--color-text)] bg-[var(--color-bg-secondary)] p-3 rounded-lg border border-[var(--color-border)] select-none">
            {phrase}
          </p>
        </div>

        <input
          autoFocus
          type="text"
          className="w-full bg-transparent border-b-2 border-[var(--color-border)] py-3 text-center text-sm font-bold outline-none focus:border-[var(--color-accent)] transition-colors uppercase"
          placeholder="KETIK DI SINI..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm()
          }}
        />

        <div className="mt-8 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-mono text-[10px] tracking-widest text-[var(--color-text-muted)] uppercase"
          >
            BATAL
          </button>
          <button
            onClick={handleConfirm}
            disabled={input.trim().toUpperCase() !== phrase.toUpperCase()}
            className="flex-1 py-3 bg-red-500/10 rounded-xl font-mono text-[10px] tracking-widest text-red-500 uppercase disabled:opacity-20"
          >
            KONFIRMASI
          </button>
        </div>
      </div>
    </div>
  )
}
