import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { SwipePages } from './components/SwipePages'
import { RefreshProvider, useRefresh } from './context/RefreshContext'
import { HabitsView } from './features/habits/HabitsView'
import { ReviewView } from './features/review/ReviewView'
import { TodayView } from './features/today/TodayView'
import { TomorrowView } from './features/tomorrow/TomorrowView'
import { seedDefaultsIfEmpty } from './lib/db/schema'
import { initGoogleAuth } from './lib/gcal'
import type { Habit } from './lib/db/types'
import { SyncIndicator } from './components/SyncIndicator'

// Lazy loaded components for better performance
const FabPlus = lazy(() => import('./components/FabPlus').then(m => ({ default: m.FabPlus })))
const HabitDetailSheet = lazy(() => import('./components/habits/HabitDetailSheet').then(m => ({ default: m.HabitDetailSheet })))
const CreateHabitSheet = lazy(() => import('./components/habits/CreateHabitSheet').then(m => ({ default: m.CreateHabitSheet })))
const SpotlightModal = lazy(() => import('./components/SpotlightModal').then(m => ({ default: m.SpotlightModal })))
const SettingsSheet = lazy(() => import('./components/settings/SettingsSheet').then(m => ({ default: m.SettingsSheet })))

function AppContent() {
  const [ready, setReady] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [createHabitOpen, setCreateHabitOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { refresh } = useRefresh()

  useEffect(() => {
    initGoogleAuth()
    void seedDefaultsIfEmpty().then(() => setReady(true))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickAddOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const onSelectHabit = useCallback((habit: Habit) => {
    setSelectedHabit(habit)
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-mono text-xs text-[var(--color-text-muted)]">MEMUAT</p>
      </div>
    )
  }

  return (
    <>
      <SyncIndicator />
      <SwipePages
        labels={['Hari ini', 'Besok', 'Habit', 'Review']}
        pages={[
          <TodayView
            key="today"
            onSelectHabit={onSelectHabit}
            onOpenSettings={() => setSettingsOpen(true)}
          />,
          <TomorrowView key="tomorrow" onSelectHabit={onSelectHabit} />,
          <HabitsView key="habits" onSelectHabit={onSelectHabit} />,
          <ReviewView key="review" />,
        ]}
        defaultIndex={0}
        onIndexChange={setActiveIndex}
      />

      {activeIndex === 2 && !selectedHabit && !quickAddOpen && (
        <button
          type="button"
          onClick={() => setCreateHabitOpen(true)}
          className="fixed bottom-24 left-1/2 z-50 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full shadow-md border border-[var(--color-border)] transition active:scale-95"
          style={{
            background: 'var(--color-bg)',
            color: 'var(--color-accent)',
            marginBottom: 'env(safe-area-inset-bottom)',
          }}
          aria-label="Buat Habit Baru"
          title="Buat Habit Baru (Visual)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </button>
      )}

      <Suspense fallback={null}>
        <FabPlus onClick={() => setQuickAddOpen(true)} hidden={quickAddOpen || !!selectedHabit} />
        <SpotlightModal
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          onSaved={refresh}
        />
        <CreateHabitSheet open={createHabitOpen} onClose={() => setCreateHabitOpen(false)} />
        <HabitDetailSheet habit={selectedHabit} onClose={() => setSelectedHabit(null)} />
        <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <RefreshProvider>
      <AppContent />
    </RefreshProvider>
  )
}
