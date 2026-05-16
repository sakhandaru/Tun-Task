import { useCallback, useEffect, useRef, useState } from 'react'
import { createHabitFromParsed, createTodoFromParsed } from '../lib/db/operations'
import { parseInput } from '../lib/nlp/parseInput'

interface SpotlightModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function SpotlightModal({ open, onClose, onSaved }: SpotlightModalProps) {
  const [value, setValue] = useState('')
  const [preview, setPreview] = useState('')
  const [confidence, setConfidence] = useState<'high' | 'low'>('high')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue('')
      setPreview('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => {
      const result = parseInput(value)
      setPreview(result.preview)
      setConfidence(result.item?.confidence ?? 'high')
    }, 150)
    return () => clearTimeout(t)
  }, [value])

  const save = useCallback(async () => {
    const result = parseInput(value)
    if (!result.item) return

    if (result.item.type === 'todo') {
      await createTodoFromParsed(result.item)
    } else {
      await createHabitFromParsed(result.item)
    }

    setValue('')
    setPreview('')
    onSaved()
    onClose()
  }, [value, onSaved, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[20vh] backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-panel w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Tambah cepat"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
          }}
          placeholder="Ketik singkat… gym besok jam 7"
          className="w-full border-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 text-xl font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          autoComplete="off"
        />
        {value.trim() && (
          <p
            className={`px-5 py-3 font-mono text-xs ${
              confidence === 'low' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            {preview}
          </p>
        )}
        <p className="px-5 py-3 font-mono text-[10px] tracking-wide text-[var(--color-text-muted)]">
          ENTER simpan · ESC tutup
        </p>
      </div>
    </div>
  )
}
