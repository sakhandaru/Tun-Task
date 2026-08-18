import { useState, useEffect } from 'react'
import { useRoutines } from '../../hooks/useLiveDb'
import { createRoutine, deleteRoutine, updateRoutine } from '../../lib/db/operations'
import type { Routine, RoutineItem } from '../../lib/db/types'
import { loginGoogle } from '../../lib/gcal'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

type View = 'menu' | 'routines'

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const routines = useRoutines()
  const [view, setView] = useState<View>('menu')
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const checkConnection = () => {
      const token = localStorage.getItem('gcal_token')
      const expiry = localStorage.getItem('gcal_token_expiry')
      if (token && expiry && Date.now() < parseInt(expiry)) {
        setIsConnected(true)
      } else {
        setIsConnected(false)
      }
    }
    checkConnection()
    window.addEventListener('gcal_auth_changed', checkConnection)
    return () => window.removeEventListener('gcal_auth_changed', checkConnection)
  }, [])

  if (!open) return null

  const handleDisconnect = () => {
    localStorage.removeItem('gcal_token')
    localStorage.removeItem('gcal_token_expiry')
    setIsConnected(false)
  }

  const handleClose = () => {
    setView('menu')
    onClose()
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createRoutine(newName.trim())
    setNewName('')
    setIsAdding(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return
    await deleteRoutine(id)
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="sheet-panel max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-[var(--color-surface)] px-4 pt-4 pb-10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-border)]" />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {view !== 'menu' && (
              <button
                onClick={() => setView('menu')}
                className="mb-1 text-[10px] font-mono text-[var(--color-accent)] uppercase tracking-widest"
              >
                ← KEMBALI
              </button>
            )}
            <h2 className="text-xl font-semibold text-[var(--color-text)]">
              {view === 'menu' && 'Menu Utama'}
              {view === 'routines' && 'Paket Rutinitas'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="font-mono text-xs text-[var(--color-text-muted)]"
          >
            TUTUP
          </button>
        </div>

        {view === 'menu' && (
          <div className="space-y-3">
            <button
              onClick={() => setView('routines')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-transform"
            >
              <span className="text-sm font-medium">Kelola Paket Rutinitas</span>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">ATUR →</span>
            </button>

            <button
              onClick={() => (isConnected ? handleDisconnect() : void loginGoogle())}
              className={`w-full flex items-center justify-between p-4 rounded-xl border active:scale-[0.98] transition-all ${
                isConnected
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
              }`}
            >
              <div className="text-left">
                <span className={`block text-sm font-medium ${isConnected ? 'text-green-500' : ''}`}>
                  {isConnected ? 'Google Calendar Terhubung' : 'Hubungkan Google Calendar'}
                </span>
                <span className="block text-[10px] text-[var(--color-text-muted)]">
                  {isConnected ? 'Klik untuk putuskan akses' : 'Aktifkan notifikasi agenda'}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono ${
                  isConnected ? 'text-green-500' : 'text-[var(--color-accent)]'
                }`}
              >
                {isConnected ? 'AKTIF ✓' : 'HUBUNGKAN →'}
              </span>
            </button>
          </div>
        )}

        {view === 'routines' && (
          <div className="space-y-6">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-mono tracking-widest text-[var(--color-text-muted)] uppercase">
                  Paket Rutinitas
                </h3>
                {!isAdding && (
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none' }}
                    className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
                  >
                    + BARU
                  </button>
                )}
              </div>

              {isAdding && (
                <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nama paket..."
                    className="w-full bg-transparent text-sm font-medium outline-none"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleAdd()
                      if (e.key === 'Escape') setIsAdding(false)
                    }}
                  />
                  <div className="mt-4 flex justify-end gap-4 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-accent)', color: '#ffffff', border: 'none' }}
                      className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
                    >
                      BATAL
                    </button>
                    <button
                      type="button"
                      onClick={handleAdd}
                      style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none' }}
                      className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
                    >
                      SIMPAN
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {routines.map((routine) => (
                  <RoutineRow
                    key={routine.id}
                    routine={routine}
                    isEditing={editingId === routine.id}
                    onToggleEdit={() => setEditingId(editingId === routine.id ? null : routine.id)}
                    onDelete={() => void handleDelete(routine.id)}
                    onUpdate={(updates) => void updateRoutine(routine.id, updates)}
                  />
                ))}
                {routines.length === 0 && !isAdding && (
                  <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                    Belum ada paket.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function RoutineRow({
  routine,
  isEditing,
  onToggleEdit,
  onDelete,
  onUpdate,
}: {
  routine: Routine
  isEditing: boolean
  onToggleEdit: () => void
  onDelete: () => void
  onUpdate: (updates: Partial<Routine>) => void
}) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(false)
  const [time, setTime] = useState('')

  const addItem = () => {
    if (!title.trim()) return
    const newItem: RoutineItem = {
      title: title.trim(),
      priority: priority || undefined,
      scheduledTime: time || undefined,
    }
    onUpdate({ items: [...routine.items, newItem] })
    setTitle('')
    setPriority(false)
    setTime('')
  }

  const removeItem = (index: number) => {
    const next = [...routine.items]
    next.splice(index, 1)
    onUpdate({ items: next })
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div onClick={onToggleEdit} className="flex-1 cursor-pointer">
          <p className="text-sm font-medium">{routine.name}</p>
          <p className="text-[9px] font-mono text-[var(--color-text-muted)] uppercase">
            {routine.items.length} TUGAS
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onToggleEdit}
            style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none' }}
            className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
          >
            {isEditing ? 'TUTUP' : 'ATUR'}
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={onDelete}
              style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: '9999px', background: 'var(--color-accent)', color: '#ffffff', border: 'none' }}
              className="shrink-0 hover:opacity-90 active:scale-95 transition-all"
            >
              HAPUS
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-[var(--color-border)] p-3 space-y-3">
          {/* Item List */}
          {routine.items.length > 0 && (
            <ul className="space-y-1">
              {routine.items.map((item, i) => (
                <li key={i} className="flex items-center gap-2 py-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-text)] truncate">
                      {item.priority && <span className="text-[var(--color-accent)] mr-1">!</span>}
                      {item.title}
                    </p>
                    {item.scheduledTime && (
                      <p className="font-mono text-[9px] text-[var(--color-text-muted)]">{item.scheduledTime}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="shrink-0 font-mono text-[9px] text-[var(--color-text-muted)]"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add Form */}
          <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
            <input
              type="text"
              placeholder="Nama tugas..."
              className="w-full bg-transparent text-xs outline-none border-b border-[var(--color-border)] pb-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
            />
            <div className="flex items-center gap-3">
              <input
                type="time"
                className="bg-transparent font-mono text-[10px] text-[var(--color-text-muted)] outline-none"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setPriority(p => !p)}
                className={`font-mono text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                  priority
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                ! PRIORITAS
              </button>
              <button
                type="button"
                onClick={addItem}
                style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none' }}
                className="ml-auto shrink-0 hover:opacity-90 active:scale-95 transition-all"
              >
                + TAMBAH
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
