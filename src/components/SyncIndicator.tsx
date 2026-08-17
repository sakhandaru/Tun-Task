import { useEffect, useState } from 'react'
import { getSyncState, subscribeSyncState, triggerSync, type SyncState } from '../lib/sync/syncManager'

export function SyncIndicator() {
  const [syncState, setSyncState] = useState<SyncState>(getSyncState())

  useEffect(() => {
    return subscribeSyncState((newState) => {
      setSyncState(newState)
    })
  }, [])

  useEffect(() => {
    // Auto-sync on startup to pull changes from other devices
    void triggerSync()
  }, [])

  const pat = localStorage.getItem('tuntask_sync_pat') || ''
  const repo = localStorage.getItem('tuntask_sync_repo') || ''
  const isConfigured = pat && repo

  if (!isConfigured) {
    return null // Don't show indicator if not configured
  }

  let colorClass = 'bg-zinc-500'
  let label = 'Belum terkonfigurasi'
  let isInteractive = false

  switch (syncState.status) {
    case 'waiting':
      colorClass = 'bg-yellow-500 animate-pulse'
      label = 'Menunggu sinkronisasi...'
      break
    case 'syncing':
      colorClass = 'bg-blue-500 animate-pulse'
      label = 'Sedang menyinkronkan ke GitHub...'
      break
    case 'success':
      colorClass = 'bg-green-500 cursor-pointer active:scale-90 hover:scale-110'
      label = `Sinkronisasi berhasil: ${new Date(syncState.lastSync || '').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}. Klik untuk sinkronisasi paksa.`
      isInteractive = true
      break
    case 'error':
      colorClass = 'bg-red-500 cursor-pointer active:scale-90 hover:scale-110'
      label = `Gagal sinkronisasi: ${syncState.error}. Klik untuk mencoba kembali.`
      isInteractive = true
      break
    case 'idle':
    default:
      colorClass = 'bg-zinc-500 cursor-pointer active:scale-90 hover:scale-110'
      label = 'Siap sinkronisasi. Klik untuk sinkronisasi paksa.'
      isInteractive = true
      break
  }

  const handleClick = () => {
    if (isInteractive && syncState.status !== 'syncing') {
      void triggerSync()
    }
  }

  return (
    <div
      onClick={handleClick}
      title={label}
      className={`fixed top-5 right-5 z-[100] h-2.5 w-2.5 rounded-full shadow-lg transition-all duration-300 ${colorClass}`}
      role={isInteractive ? 'button' : 'status'}
      aria-label={label}
    />
  )
}
