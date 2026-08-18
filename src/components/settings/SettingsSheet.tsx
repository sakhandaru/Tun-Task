import { useState, useEffect } from 'react'
import { useRoutines } from '../../hooks/useLiveDb'
import { createRoutine, deleteRoutine, updateRoutine } from '../../lib/db/operations'
import type { Routine, RoutineItem } from '../../lib/db/types'
import { loginGoogle } from '../../lib/gcal'
import { db } from '../../lib/db/schema'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

type View = 'menu' | 'routines' | 'guide_user' | 'guide_nlp'

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

  const handleExport = async () => {
    try {
      const todos = await db.todos.toArray()
      const habits = await db.habits.toArray()
      const habitLogs = await db.habitLogs.toArray()
      const routinesData = await db.routines.toArray()
      
      const backup = { todos, habits, habitLogs, routines: routinesData }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `tuntask-cadangan-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Gagal mengekspor data.')
    }
  }

  const handleImport = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!data.todos && !data.habits && !data.habitLogs) {
          alert('Format file cadangan tidak valid.')
          return
        }
        
        if (confirm('Impor data akan menimpa seluruh data saat ini. Lanjutkan?')) {
          if (data.todos) {
            await db.todos.clear()
            await db.todos.bulkAdd(data.todos)
          }
          if (data.habits) {
            await db.habits.clear()
            await db.habits.bulkAdd(data.habits)
          }
          if (data.habitLogs) {
            await db.habitLogs.clear()
            await db.habitLogs.bulkAdd(data.habitLogs)
          }
          if (data.routines) {
            await db.routines.clear()
            await db.routines.bulkAdd(data.routines)
          }
          alert('Data berhasil diimpor!')
          window.location.reload()
        }
      } catch (err) {
        console.error(err)
        alert('Gagal membaca file cadangan.')
      }
    }
    reader.readAsText(file)
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
              {view === 'guide_user' && 'Panduan Penggunaan'}
              {view === 'guide_nlp' && 'Panduan Tambah Cepat'}
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
              onClick={() => setView('guide_user')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-transform"
            >
              <span className="text-sm font-medium">Panduan Penggunaan</span>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">LIHAT →</span>
            </button>

            <button
              onClick={() => setView('guide_nlp')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-transform"
            >
              <span className="text-sm font-medium">Panduan Tambah Cepat (NLP)</span>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">LIHAT →</span>
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

            {/* Cadangan Data (Backup & Restore) */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] space-y-3">
              <span className="block text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase">CADANGAN DATA</span>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                Ekspor data Anda ke file JSON untuk dipindahkan ke HP baru, lalu impor file tersebut di HP baru Anda.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExport}
                  style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '6px 12px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none' }}
                  className="flex-1 hover:opacity-90 active:scale-95 transition-all text-center uppercase"
                >
                  EKSPOR
                </button>
                <label
                  style={{ fontFamily: 'Geist Mono Variable, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.12em', padding: '6px 12px', borderRadius: '9999px', background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', cursor: 'pointer' }}
                  className="flex-1 hover:opacity-90 active:scale-95 transition-all text-center uppercase block"
                >
                  IMPOR
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleImport(file)
                    }}
                    className="hidden"
                  />
                </label>
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

        {view === 'guide_user' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <h4 className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase mb-2">NAVIGASI SWIPE</h4>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  Geser layar ke kiri atau kanan untuk berpindah dengan cepat antara halaman:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-[var(--color-text-muted)] font-mono uppercase">
                  <li>Hari ini (Tugas & Habit saat ini)</li>
                  <li>Besok (Rencana hari esok)</li>
                  <li>Habit (Daftar semua kebiasaan aktif)</li>
                  <li>Review (Dashboard & Widget Nothing UI)</li>
                </ul>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <h4 className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase mb-2">MENYELESAIKAN TUGAS</h4>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  Cukup ketuk lingkaran di sebelah kiri tugas atau kebiasaan untuk menandai selesai. Untuk membatalkan atau menjadwal ulang ke hari esok, gunakan tombol aksi cepat di sebelah kanan.
                </p>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <h4 className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase mb-2">SISTEM SKOR & STREAK</h4>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  Poin Anda bertambah setiap kali tugas/habit diselesaikan. Selesaikan habit secara berurutan tanpa putus untuk menaikkan <span className="text-[var(--color-accent)] font-semibold">Streak Hari</span> Anda.
                </p>
              </div>
            </section>
          </div>
        )}

        {view === 'guide_nlp' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                Anda bisa menekan tombol <strong className="text-[var(--color-accent)] font-semibold">+</strong> di bawah layar, lalu ketik menggunakan bahasa natural. Sistem akan otomatis mendeteksi nama tugas, jam, tanggal, prioritas, atau menjadikannya habit.
              </p>

              <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
                <h4 className="text-[10px] font-mono tracking-widest text-[var(--color-text-muted)] uppercase">FORMAT PENULISAN & CONTOH</h4>
                
                <div className="space-y-2">
                  <span className="block text-[10px] font-mono text-[var(--color-text-muted)] uppercase">1. TUGAS + WAKTU (JAM)</span>
                  <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
                    <p className="font-mono text-xs text-[var(--color-text)]">Meeting jam 14:00</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">→ Menambah tugas dengan waktu terjadwal pukul 14:00</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[10px] font-mono text-[var(--color-text-muted)] uppercase">2. TUGAS + HARI / TANGGAL</span>
                  <div className="p-3 bg-[var(--color-bg-secondary)] border border border-[var(--color-border)] rounded-xl">
                    <p className="font-mono text-xs text-[var(--color-text)]">Beli kopi besok pagi</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">→ Menjadwalkan tugas untuk esok hari</p>
                  </div>
                  <div className="p-3 bg-[var(--color-bg-secondary)] border border border-[var(--color-border)] rounded-xl">
                    <p className="font-mono text-xs text-[var(--color-text)]">Potong rambut hari sabtu</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">→ Menjadwalkan tugas untuk hari Sabtu terdekat</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[10px] font-mono text-[var(--color-text-muted)] uppercase">3. TUGAS PRIORITAS (!)</span>
                  <div className="p-3 bg-[var(--color-bg-secondary)] border border border-[var(--color-border)] rounded-xl">
                    <p className="font-mono text-xs text-[var(--color-text)]">Bayar kostan !</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">→ Tanda seru (!) menandai tugas sebagai Prioritas Tinggi</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[10px] font-mono text-[var(--color-text-muted)] uppercase">4. MEMBUAT HABIT OTOMATIS</span>
                  <div className="p-3 bg-[var(--color-bg-secondary)] border border border-[var(--color-border)] rounded-xl">
                    <p className="font-mono text-xs text-[var(--color-text)]">Minum air putih setiap hari</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">→ Kata "setiap hari" / "setiap pagi" otomatis membuat habit baru</p>
                  </div>
                </div>
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
