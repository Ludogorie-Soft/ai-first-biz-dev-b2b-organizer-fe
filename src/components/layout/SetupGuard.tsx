'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSetupStatus } from '@/hooks/useSetupStatus'

const ALLOWED_DURING_SETUP = [
  '/setup',
  '/mailboxes',
  '/sequences',
  '/target-groups',
  '/settings',
  '/admin',
]

function isAllowedDuringSetup(pathname: string) {
  return ALLOWED_DURING_SETUP.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoading, isComplete } = useSetupStatus()

  useEffect(() => {
    if (isLoading || isComplete || isAllowedDuringSetup(pathname)) return
    router.replace('/setup')
  }, [isLoading, isComplete, pathname, router])

  return children
}
