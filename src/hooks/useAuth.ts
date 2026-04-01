'use client'

import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { token, user, setAuth, logout } = useAuthStore()
  return { token, user, setAuth, logout, isAuthenticated: !!token }
}
