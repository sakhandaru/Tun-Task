import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface RefreshContextValue {
  token: number
  refresh: () => void
}

const RefreshContext = createContext<RefreshContextValue | null>(null)

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(0)
  const refresh = useCallback(() => setToken((t) => t + 1), [])
  return (
    <RefreshContext.Provider value={{ token, refresh }}>{children}</RefreshContext.Provider>
  )
}

export function useRefresh() {
  const ctx = useContext(RefreshContext)
  if (!ctx) throw new Error('useRefresh must be used within RefreshProvider')
  return ctx
}
