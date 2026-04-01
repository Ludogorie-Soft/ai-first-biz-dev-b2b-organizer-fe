'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { setAuthStateGetter } from '@/lib/api'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setAuthStateGetter(() => {
      const state = useAuthStore.getState()
      return {
        token: state.token,
        refreshToken: state.refreshToken,
        logout: state.logout,
      }
    })
  }, [])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>{children}</AuthInitializer>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
