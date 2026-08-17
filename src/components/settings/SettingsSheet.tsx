import { useState, useEffect } from 'react'
import { useRefreshToken, useRoutines } from '../../hooks/useLiveDb'
import { createRoutine, deleteRoutine, updateRoutine } from '../../lib/db/operations'
import type { Routine, RoutineItem } from '../../lib/db/types'
import { loginGoogle } from '../../lib/gcal'

import { AllTasksView } from '../../features/all-tasks/AllTasksView'
import { getSyncState, subscribeSyncState, triggerSync } from '../../lib/sync/syncManager'
import type { SyncState } from '../../lib/sync/syncManager'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

type View = 'menu' | 'routines' | 'all-tasks' | 'obsidian-sync'

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { token, refresh } = useRefreshToken()
  const routines = useRoutines(token)
  const [view, setView] = useState<View>('menu')
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Obsidian sync configuration states
  const [pat, setPat] = useState(localStorage.getItem('tuntask_sync_pat') || '')
  const [repo, setRepo] = useState(localStorage.getItem('tuntask_sync_repo') || '')
  const [tasksPath, setTasksPath] = useState(localStorage.getItem('tuntask_sync_tasks_path') || 'TunTask/tasks.md')
  const [habitsPath, setHabitsPath] = useState(localStorage.getItem('tuntask_sync_habits_path') || 'TunTask/habits.md')
  const [autoSync, setAutoSync] = useState(localStorage.getItem('tuntask_sync_auto') !== 'false')
  const [syncState, setSyncState] = useState<SyncState>(getSyncState())

  useEffect(() => {
    if (!open) return
    return subscribeSyncState((newState) => {
      setSyncState(newState)
    })
  }, [open])

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

  const handleSaveSyncConfig = (key: string, value: string) => {
    localStorage.setItem(key, value)
    if (key === 'tuntask_sync_pat') setPat(value)
    if (key === 'tuntask_sync_repo') setRepo(value)
    if (key === 'tuntask_sync_tasks_path') setTasksPath(value)
    if (key === 'tuntask_sync_habits_path') setHabitsPath(value)
  }

  const handleToggleAutoSync = () => {
    const newVal = !autoSync
    setAutoSync(newVal)
    localStorage.setItem('tuntask_sync_auto', String(newVal))
  }

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
    refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return
    await deleteRoutine(id)
    refresh()
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
              {view === 'all-tasks' && 'Semua Tugas'}
              {view === 'obsidian-sync' && 'Sinkronisasi Obsidian'}
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
              onClick={() => setView('all-tasks')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-transform"
            >
              <span className="text-sm font-medium">Daftar Semua Tugas</span>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">LIHAT →</span>
            </button>
            <button
              onClick={() => setView('routines')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-transform"
            >
              <span className="text-sm font-medium">Kelola Paket Rutinitas</span>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">ATUR →</span>
            </button>
            <button
              onClick={() => setView('obsidian-sync')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-transform"
            >
              <span className="text-sm font-medium">Sinkronisasi Obsidian</span>
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

        {view === 'all-tasks' && <AllTasksView />}

        {view === 'obsidian-sync' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">GitHub Personal Access Token (PAT)</label>
                <input
                  type="password"
                  value={pat}
                  onChange={(e) => handleSaveSyncConfig('tuntask_sync_pat', e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm outline-none text-[var(--color-text)] focus:border-[var(--color-accent)]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Repository (username/repo)</label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => handleSaveSyncConfig('tuntask_sync_repo', e.target.value)}
                  placeholder="username/Obsidian-Vault"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm outline-none text-[var(--color-text)] focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Jalur File Tasks (.md)</label>
                <input
                  type="text"
                  value={tasksPath}
                  onChange={(e) => handleSaveSyncConfig('tuntask_sync_tasks_path', e.target.value)}
                  placeholder="TunTask/tasks.md"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm outline-none text-[var(--color-text)] focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Jalur File Habits (.md)</label>
                <input
                  type="text"
                  value={habitsPath}
                  onChange={(e) => handleSaveSyncConfig('tuntask_sync_habits_path', e.target.value)}
                  placeholder="TunTask/habits.md"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm outline-none text-[var(--color-text)] focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <div>
                  <span className="block text-sm font-medium">Sinkronisasi Otomatis</span>
                  <span className="block text-[10px] text-[var(--color-text-muted)]">Sinkronkan di background tiap ada perubahan</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoSync}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    autoSync
                      ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {autoSync ? 'AKTIF' : 'NONAKTIF'}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
              <button
                type="button"
                disabled={syncState.status === 'syncing'}
                onClick={() => void triggerSync()}
                className="w-full bg-[var(--color-accent)] text-[var(--color-text-on-accent)] font-semibold rounded-xl py-3 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {syncState.status === 'syncing' ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
              </button>

              <div className="text-center font-mono text-[10px] text-[var(--color-text-muted)]">
                {syncState.status === 'success' && (
                  <p className="text-green-500 font-semibold">✓ Sinkronisasi Berhasil</p>
                )}
                {syncState.status === 'error' && (
                  <p className="text-red-500 font-semibold">⚠️ Error: {syncState.error}</p>
                )}
                {syncState.lastSync ? (
                  <p className="mt-1">Terakhir Sync: {new Date(syncState.lastSync).toLocaleString('id-ID')}</p>
                ) : (
                  <p className="mt-1">Belum pernah disinkronkan</p>
                )}
              </div>
            </div>
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
                  className="text-[10px] font-mono text-[var(--color-accent)]"
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
                  <button type="button" onClick={() => setIsAdding(false)}>
                    BATAL
                  </button>
                  <button type="button" onClick={handleAdd} className="text-[var(--color-accent)]">
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
                  onUpdate={(updates) => void updateRoutine(routine.id, updates).then(refresh)}
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div onClick={onToggleEdit} className="flex-1 cursor-pointer">
          <p className="text-sm font-medium">{routine.name}</p>
          <p className="text-[9px] font-mono text-[var(--color-text-muted)] uppercase">
            {routine.items.length} ITEM
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onToggleEdit}
            className="text-[9px] font-mono text-[var(--color-accent)]"
          >
            {isEditing ? 'TUTUP' : 'ATUR'}
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[9px] font-mono text-red-500/50"
            >
              HAPUS
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-[var(--color-border)] p-3 space-y-3">
          <div className="space-y-1.5">
            {routine.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-[var(--color-text-muted)] w-8">
                    {item.type.toUpperCase()}
                  </span>
                  <span className="text-[var(--color-text)]">{item.title}</span>
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
              placeholder="Tambah isi..."
              className="w-full bg-transparent border-b border-[var(--color-border)] pb-1 text-xs outline-none"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => addItem('todo')}
                className="chip text-[9px] bg-transparent"
              >
                + TUGAS
              </button>
              <button
                type="button"
                onClick={() => addItem('habit')}
                className="chip text-[9px] bg-transparent"
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
