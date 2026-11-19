'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { getMailboxes } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { useAuth } from '@/hooks/useAuth'
import { pauseReasonText, pausedSinceText, type MailboxPauseInfo } from '@/lib/mailboxPause'

interface MailboxRow extends MailboxPauseInfo {
  id: string
  email: string
}

/**
 * Red warning at the top of every dashboard page while a mailbox of the
 * active company is paused (e.g. auto-paused for a high bounce rate).
 * Only global admins can resume a mailbox, so other users are asked to
 * contact one; global admins get a link to the Admin page instead.
 */
export function PausedMailboxBanner() {
  const t = useTranslations()
  const { user, isAuthenticated } = useAuth()

  const { data } = useQuery({
    queryKey: queryKeys.mailboxes.all,
    queryFn: getMailboxes,
    enabled: isAuthenticated,
    refetchInterval: 5 * 60 * 1000,
  })

  const paused = ((data ?? []) as MailboxRow[]).filter((mb) => mb.is_paused)
  if (paused.length === 0) return null

  const isGlobalAdmin = user?.role === 'global_admin'

  return (
    <div role="alert" className="mb-6 space-y-3">
      {paused.map((mb) => (
        <div key={mb.id} className="flex gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-red-900">
              {t['mailboxPause.bannerTitle'].replace('{email}', mb.email)}
              {pausedSinceText(mb, t) && <span className="font-normal"> {pausedSinceText(mb, t)}</span>}
            </p>
            <p>
              <span className="font-medium">{t['mailboxPause.reasonLabel']}</span> {pauseReasonText(mb, t)}
            </p>
            <p>{t['mailboxPause.queuedKept']}</p>
            {isGlobalAdmin ? (
              <p>
                <Link href="/admin" className="font-medium underline hover:text-red-950">
                  {t['mailboxPause.adminResumeLink']}
                </Link>
              </p>
            ) : (
              <p className="font-medium">{t['mailboxPause.contactAdmin']}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
