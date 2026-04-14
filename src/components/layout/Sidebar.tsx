'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Megaphone,
  ListOrdered,
  Users,
  Mail,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCompanyStore } from '@/stores/companyStore'
import { queryClient } from '@/app/providers'
import { useLangStore } from '@/stores/langStore'
import { useTranslations } from '@/hooks/useTranslations'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import { CompanySwitcher } from '@/components/layout/CompanySwitcher'

const navItems = [
  { key: 'nav.campaigns', href: '/campaigns', icon: Megaphone },
  { key: 'nav.sequences', href: '/sequences', icon: ListOrdered },
  { key: 'nav.targetGroups', href: '/target-groups', icon: Users },
  { key: 'nav.mailboxes', href: '/mailboxes', icon: Mail },
  { key: 'nav.settings', href: '/settings', icon: Settings },
] as const

const adminNavItems = [
  { key: 'admin.title', href: '/admin', icon: ShieldCheck },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()
  const { user, logout } = useAuthStore()
  const { clearActiveCompany } = useCompanyStore()
  const { lang, setLang } = useLangStore()

  function handleLogout() {
    logout()
    clearActiveCompany()
    queryClient.clear()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-slate-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5">
        <Link href="/campaigns" className="text-lg font-semibold text-slate-900 tracking-tight hover:opacity-80 transition-opacity">
          BizDev <span className="text-indigo-600">B2B</span>
        </Link>
      </div>

      <Separator />

      {/* Company switcher */}
      <CompanySwitcher />

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ key, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-slate-100 text-indigo-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {t[key]}
            </Link>
          )
        })}

        {user?.role === 'global_admin' && (
          <>
            <Separator className="my-2" />
            {adminNavItems.map(({ key, href, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-indigo-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {t[key]}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-3">
        <Separator />

        {/* Language toggle */}
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={() => setLang('bg')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              lang === 'bg'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            BG
          </button>
          <span className="text-slate-300 text-xs">|</span>
          <button
            onClick={() => setLang('en')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              lang === 'en'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            EN
          </button>
        </div>

        {/* User */}
        {user && (
          <div className="px-2">
            <p className="text-xs text-slate-500 truncate mb-2">{user.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-500 hover:text-slate-900 px-2 h-8"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              {t['auth.logout']}
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
