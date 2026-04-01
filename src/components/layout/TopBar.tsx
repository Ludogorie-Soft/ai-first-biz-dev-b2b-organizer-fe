'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from '@/hooks/useTranslations'

const pathToKey: Record<string, string> = {
  '/campaigns': 'nav.campaigns',
  '/sequences': 'nav.sequences',
  '/target-groups': 'nav.targetGroups',
  '/mailboxes': 'nav.mailboxes',
  '/settings': 'nav.settings',
}

export function TopBar() {
  const pathname = usePathname()
  const t = useTranslations()

  const matchedKey = Object.entries(pathToKey).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1]

  const title = matchedKey ? t[matchedKey as keyof typeof t] : ''

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-6">
      <span className="text-sm font-medium text-slate-500">{title}</span>
    </header>
  )
}
