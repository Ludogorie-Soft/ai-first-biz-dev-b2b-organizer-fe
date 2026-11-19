'use client'

import { Flame, CheckCircle2 } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface MailboxWarmupInfo {
  is_warming_up: boolean
  warmup_ends_at: string | null
}

/** "Warming up · Full limit from <date>" or "Warmed up". */
export function MailboxWarmupBadge({ mailbox }: { mailbox: MailboxWarmupInfo }) {
  const t = useTranslations()

  if (!mailbox.is_warming_up) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        {t['mailboxes.warmedUp']}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
        title={t['mailboxes.warmingUpTooltip']}
      >
        <Flame className="h-3 w-3" />
        {t['mailboxes.warmingUp']}
      </span>
      {mailbox.warmup_ends_at && (
        <span className="text-xs text-slate-400">
          {t['mailboxes.warmupEnds']} {new Date(mailbox.warmup_ends_at).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}

/** Confirms marking a mailbox as already warmed up (warmedUp=true) or restarting its warmup. */
export function MailboxWarmupDialog({
  target,
  pending,
  onCancel,
  onConfirm,
}: {
  target: { email: string; warmedUp: boolean } | null
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useTranslations()

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target?.warmedUp ? t['mailboxes.markWarmedUpTitle'] : t['mailboxes.restartWarmupTitle']}
          </DialogTitle>
          {target && <p className="text-sm font-medium text-slate-700">{target.email}</p>}
          <DialogDescription>
            {target?.warmedUp ? t['mailboxes.markWarmedUpDesc'] : t['mailboxes.restartWarmupDesc']}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t['common.cancel']}
          </Button>
          <Button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={pending}
            onClick={onConfirm}
          >
            {target?.warmedUp ? t['mailboxes.markWarmedUp'] : t['mailboxes.restartWarmup']}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
