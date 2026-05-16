import { useState } from 'react'
import { useRefreshToken, useRoutines } from '../../hooks/useLiveDb'
import { createRoutine, deleteRoutine, updateRoutine } from '../../lib/db/operations'
import type { Routine, RoutineItem } from '../../lib/db/types'

export function RoutinesView() {
  const { token, refresh } = useRefreshToken()
  const routines = useRoutines(token)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createRoutine(newName.trim())
    setNewName('')
    setIsAdding(false)
    refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return
    await deleteRoutine(id)
    refresh()
  }

  return (
    <div className="space-y-6 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Rutinitas
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Paket tugas/habit untuk sekali klik
          </p>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs font-mono tracking-widest text-[var(--color-accent)]"
          >
            TAMBAH
          </button>
        )}
      </header>

      {isAdding && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <input
            autoFocus
            type="text"
            placeholder="Nama paket (misal: Pagi)"
            className="w-full bg-transparent text-lg font-medium outline-none"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd()
              if (e.key === 'Escape') setIsAdding(false)
            }}
          />
          <div className="mt-4 flex justify-end gap-4 text-xs font-mono">
            <button type="button" onClick={() => setIsAdding(false)}>
              BATAL
            </button>
            <button type="button" onClick={handleAdd} className="text-[var(--color-accent)]">
              SIMPAN
            </button>
          </div>
        </div>
      )}

      {routines.length === 0 && !isAdding ? (
        <p className="text-sm text-[var(--color-text-muted)]">Belum ada paket rutinitas.</p>
      ) : (
        <div className="space-y-4">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              isEditing={editingId === routine.id}
              onToggleEdit={() => setEditingId(editingId === routine.id ? null : routine.id)}
              onDelete={() => void handleDelete(routine.id)}
              onUpdate={(updates) => void updateRoutine(routine.id, updates).then(refresh)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RoutineCard({
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
  const [itemInput, setItemInput] = useState('')

  const addItem = (type: 'todo' | 'habit') => {
    if (!itemInput.trim()) return
    const newItem: RoutineItem = { type, title: itemInput.trim() }
    onUpdate({ items: [...routine.items, newItem] })
    setItemInput('')
  }

  const removeItem = (index: number) => {
    const next = [...routine.items]
    next.splice(index, 1)
    onUpdate({ items: next })
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div>
          <h3 className="font-semibold">{routine.name}</h3>
          <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase">
            {routine.items.length} ITEM
          </p>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onToggleEdit}
            className="text-[10px] font-mono text-[var(--color-accent)]"
          >
            {isEditing ? 'TUTUP' : 'ATUR'}
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[10px] font-mono text-red-500/70"
            >
              HAPUS
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-[var(--color-border)] p-4 space-y-4">
          <div className="space-y-2">
            {routine.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] w-10">
                    {item.type.toUpperCase()}
                  </span>
                  <span>{item.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-[var(--color-text-muted)] p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <input
              type="text"
              placeholder="Tambah isi (misal: Baca buku)"
              className="w-full bg-transparent border-b border-[var(--color-border)] pb-1 text-sm outline-none"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
            />
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => addItem('todo')}
                className="chip text-[10px] bg-transparent"
              >
                + TUGAS
              </button>
              <button
                type="button"
                onClick={() => addItem('habit')}
                className="chip text-[10px] bg-transparent"
              >
                + HABIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
