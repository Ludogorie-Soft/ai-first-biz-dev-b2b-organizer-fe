'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { refreshSession } from '@/lib/api'

interface User {
  id: string
  email: string
  role?: 'owner' | 'admin' | 'member' | 'global_admin'
}

interface AuthState {
  token: string | null
  refreshTokenValue: string | null
  user: User | null
  setAuth: (token: string, refreshToken: string, user: User) => void
  logout: () => void
  refreshToken: () => Promise<string | null>
}

// Cookie-based storage so the middleware can read the token server-side
const cookieStorage = createJSONStorage(() => ({
  getItem: (name: string): string | null => {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
  },
  setItem: (name: string, value: string) => {
    if (typeof document === 'undefined') return
    // 30-day expiry, SameSite=Lax
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
  },
  removeItem: (name: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=; path=/; max-age=0`
  },
}))

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshTokenValue: null,
      user: null,
      setAuth: (token, refreshToken, user) =>
        set({ token, refreshTokenValue: refreshToken, user }),
      logout: () => set({ token: null, refreshTokenValue: null, user: null }),
      refreshToken: async () => {
        const { refreshTokenValue } = get()
        if (!refreshTokenValue) return null
        try {
          const data = await refreshSession(refreshTokenValue)
          const newToken = data.token || data.access_token
          set({ token: newToken })
          return newToken
        } catch {
          set({ token: null, refreshTokenValue: null, user: null })
          return null
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: cookieStorage,
    }
  )
)
