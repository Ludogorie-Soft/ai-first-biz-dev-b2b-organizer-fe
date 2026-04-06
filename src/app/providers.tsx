'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuthStore } from '@/stores/authStore'
import { setAuthStateGetter } from '@/lib/api'

// Singleton so login/logout handlers can clear the cache from anywhere.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
    },
  },
})

// Wire up the auth getter synchronously at module load time so the token
// is available before TanStack Query fires its first requests on mount.
setAuthStateGetter(() => {
  const state = useAuthStore.getState()
  return {
    token: state.token,
    refreshToken: state.refreshToken,
    logout: state.logout,
  }
})

export function Providers({ children }: { children: React.ReactNode }) {

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

