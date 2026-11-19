'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, Pencil, Flame, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getAdminPendingMailboxes,
  approveMailbox,
  approveMailboxDomain,
  getAdminMailboxLimits,
  updateMailboxEmailLimits,
  setAdminMailboxWarmup,
  resumeAdminMailbox,
} from '@/lib/api'
import { pauseReasonText, pausedSinceText, type MailboxPauseInfo } from '@/lib/mailboxPause'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { MailboxWarmupBadge, MailboxWarmupDialog } from '@/components/shared/MailboxWarmup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PendingMailbox {
  id: string
  email: string
  ses_status: string
  created_at: string
  company_id: string
  company_name: string
  pending_campaign_count: number
}

interface MailboxLimit extends MailboxPauseInfo {
  id: string
  email: string
  company_id: string
  company_name: string
  daily_email_limit: number
  weekly_email_limit: number
  effective_daily_limit: number
  is_warming_up: boolean
  warmup_ends_at: string | null
  sent_today: number
  sent_this_week: number
}

const limitsSchema = z
  .object({
    daily_email_limit: z.number({ error: 'Required' }).int().min(1),
    weekly_email_limit: z.number({ error: 'Required' }).int().min(1),
  })
  .refine((d) => d.weekly_email_limit >= d.daily_email_limit, {
    message: 'Weekly limit must be ≥ daily limit',
    path: ['weekly_email_limit'],
  })

type LimitsFormData = z.infer<typeof limitsSchema>

export default function AdminPage() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [editMailbox, setEditMailbox] = useState<MailboxLimit | null>(null)
  const [warmupTarget, setWarmupTarget] = useState<{ id: string; email: string; warmedUp: boolean } | null>(null)
  const [resumeTarget, setResumeTarget] = useState<MailboxLimit | null>(null)

  // Pending mailboxes
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: queryKeys.admin.pendingMailboxes,
    queryFn: getAdminPendingMailboxes,
  })
  const pendingMailboxes: PendingMailbox[] = pendingData || []

  const approveMutation = useMutation({
    mutationFn: approveMailbox,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pendingMailboxes })
      const activated = result?.activated_campaigns ?? 0
      if (activated > 0) {
        toast.success(`${t['admin.approvedSuccess']} — ${activated} ${t['admin.campaignsActivated']}`)
      } else {
        toast.success(t['admin.approvedSuccess'])
      }
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (code === 'ses_not_verified') {
        toast.error(t['admin.sesNotVerified'])
      } else {
        toast.error(t['common.error'])
      }
    },
  })

  const approveDomainMutation = useMutation({
    mutationFn: approveMailboxDomain,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pendingMailboxes })
      const activated = result?.activated_campaigns ?? 0
      if (activated > 0) {
        toast.success(`${t['admin.approvedSuccess']} — ${activated} ${t['admin.campaignsActivated']}`)
      } else {
        toast.success(t['admin.approvedSuccess'])
      }
    },
    onError: () => toast.error(t['common.error']),
  })

  // Email limits
  const { data: limitsData, isLoading: limitsLoading, isError: limitsError } = useQuery({
    queryKey: queryKeys.admin.mailboxLimits,
    queryFn: getAdminMailboxLimits,
  })
  const mailboxLimits: MailboxLimit[] = limitsData || []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LimitsFormData>({ resolver: zodResolver(limitsSchema) })

  const updateLimitsMutation = useMutation({
    mutationFn: ({ id, limits }: { id: string; limits: LimitsFormData }) =>
      updateMailboxEmailLimits(id, limits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.mailboxLimits })
      toast.success(t['admin.limitsUpdated'])
      setEditMailbox(null)
    },
    onError: () => toast.error(t['common.error']),
  })

  const warmupMutation = useMutation({
    mutationFn: ({ id, warmedUp }: { id: string; warmedUp: boolean }) =>
      setAdminMailboxWarmup(id, warmedUp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.mailboxLimits })
      toast.success(t['mailboxes.warmupUpdated'])
      setWarmupTarget(null)
    },
    onError: () => toast.error(t['common.error']),
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeAdminMailbox(id),
    onSuccess: (result: { rescheduled_jobs?: number }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.mailboxLimits })
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes.all })
      toast.success(t['admin.resumed'].replace('{count}', String(result?.rescheduled_jobs ?? 0)))
      setResumeTarget(null)
    },
    onError: () => toast.error(t['common.error']),
  })

  const pausedMailboxes = mailboxLimits.filter((mb) => mb.is_paused)

  function openEdit(mb: MailboxLimit) {
    setEditMailbox(mb)
    reset({ daily_email_limit: mb.daily_email_limit, weekly_email_limit: mb.weekly_email_limit })
  }

  return (
    <div>
      <PageHeader title={t['admin.title']} />

      {pausedMailboxes.length > 0 && (
        <section className="mb-6 rounded-lg border border-red-300 bg-red-50">
          <div className="flex items-start gap-3 px-4 pt-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <h2 className="text-sm font-semibold text-red-900">
                {t['admin.pausedMailboxesTitle']} ({pausedMailboxes.length})
              </h2>
              <p className="text-sm text-red-800">{t['admin.pausedMailboxesDesc']}</p>
            </div>
          </div>
          <ul className="divide-y divide-red-200 px-4 pb-2 pt-2">
            {pausedMailboxes.map((mb) => (
              <li key={mb.id} className="flex items-center justify-between gap-4 py-3">
                <div className="text-sm text-red-800">
                  <p className="font-medium text-red-900">
                    {mb.email} <span className="font-normal text-red-700">· {mb.company_name}</span>
                  </p>
                  <p>
                    <span className="font-medium">{t['mailboxPause.reasonLabel']}</span> {pauseReasonText(mb, t)}{' '}
                    {pausedSinceText(mb, t)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="flex-shrink-0 bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => setResumeTarget(mb)}
                >
                  {t['admin.resume']}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tabs defaultValue="pending-mailboxes">
        <TabsList className="mb-6">
          <TabsTrigger value="pending-mailboxes">{t['admin.pendingMailboxesTab']}</TabsTrigger>
          <TabsTrigger value="email-limits">{t['admin.emailLimitsTab']}</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Pending Mailboxes ── */}
        <TabsContent value="pending-mailboxes">
          {pendingLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pendingMailboxes.length === 0 ? (
            <EmptyState
              title={t['admin.noPendingMailboxes']}
              description={t['admin.noPendingMailboxesDesc']}
              icon={<ShieldCheck className="h-10 w-10 text-slate-300" />}
            />
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.email']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['admin.company']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['admin.pendingCampaigns']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['mailboxes.createdAt']}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMailboxes.map((mb) => (
                    <TableRow key={mb.id}>
                      <TableCell className="font-medium text-slate-900 text-sm">{mb.email}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{mb.company_name}</TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {mb.pending_campaign_count > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                            {mb.pending_campaign_count}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(mb.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={approveDomainMutation.isPending}
                            onClick={() => approveDomainMutation.mutate(mb.id)}
                          >
                            {approveDomainMutation.isPending
                              ? t['admin.approvingDomain']
                              : t['admin.approveDomain']}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(mb.id)}
                          >
                            {approveMutation.isPending ? t['admin.approving'] : t['admin.approve']}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Email Limits ── */}
        <TabsContent value="email-limits">
          {limitsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : limitsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
              <p className="text-sm font-medium text-red-700">{t['common.error']}</p>
              <p className="mt-1 text-xs text-red-500">{t['admin.limitsLoadError']}</p>
            </div>
          ) : mailboxLimits.length === 0 ? (
            <EmptyState
              title={t['mailboxes.noMailboxes']}
              description={t['mailboxes.noMailboxesDesc']}
              icon={<ShieldCheck className="h-10 w-10 text-slate-300" />}
            />
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.email']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['admin.company']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['mailboxes.warmupStatus']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['admin.sentToday']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['admin.dailyLimit']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['admin.sentThisWeek']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['admin.weeklyLimit']}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mailboxLimits.map((mb) => (
                    <TableRow key={mb.id}>
                      <TableCell className="font-medium text-slate-900 text-sm">
                        <div className="flex items-center gap-1.5">
                          {mb.email}
                          {mb.is_paused && <StatusBadge status="paused" label={t['mailboxes.paused']} />}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{mb.company_name}</TableCell>
                      <TableCell className="text-sm">
                        <MailboxWarmupBadge mailbox={mb} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={
                            mb.sent_today >= mb.effective_daily_limit
                              ? 'text-red-600 font-semibold'
                              : mb.sent_today >= mb.effective_daily_limit * 0.8
                              ? 'text-amber-600 font-medium'
                              : 'text-slate-700'
                          }
                        >
                          {mb.sent_today}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm font-medium">
                        {mb.effective_daily_limit !== mb.daily_email_limit ? (
                          <span title={t['mailboxes.warmingUpTooltip']}>
                            {mb.effective_daily_limit}{' '}
                            <span className="text-slate-400 text-xs font-normal">/ {mb.daily_email_limit}</span>
                          </span>
                        ) : (
                          mb.daily_email_limit
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={
                            mb.sent_this_week >= mb.weekly_email_limit
                              ? 'text-red-600 font-semibold'
                              : mb.sent_this_week >= mb.weekly_email_limit * 0.8
                              ? 'text-amber-600 font-medium'
                              : 'text-slate-700'
                          }
                        >
                          {mb.sent_this_week}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm font-medium">
                        {mb.weekly_email_limit}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={
                              mb.is_warming_up
                                ? 'text-amber-600 hover:text-slate-700'
                                : 'text-slate-400 hover:text-slate-700'
                            }
                            onClick={() =>
                              setWarmupTarget({ id: mb.id, email: mb.email, warmedUp: mb.is_warming_up })
                            }
                            title={mb.is_warming_up ? t['mailboxes.markWarmedUp'] : t['mailboxes.restartWarmup']}
                          >
                            <Flame className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-indigo-600"
                            onClick={() => openEdit(mb)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MailboxWarmupDialog
        target={warmupTarget}
        pending={warmupMutation.isPending}
        onCancel={() => setWarmupTarget(null)}
        onConfirm={() =>
          warmupTarget && warmupMutation.mutate({ id: warmupTarget.id, warmedUp: warmupTarget.warmedUp })
        }
      />

      {/* Resume Mailbox Dialog */}
      <Dialog open={!!resumeTarget} onOpenChange={(open) => !open && setResumeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t['admin.resumeConfirmTitle']}</DialogTitle>
          </DialogHeader>
          {resumeTarget && (
            <div className="space-y-3 text-sm text-slate-600">
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                <span className="font-medium">{t['mailboxPause.reasonLabel']}</span>{' '}
                {pauseReasonText(resumeTarget, t)}
              </p>
              <p>{t['admin.resumeConfirmDesc'].replace('{email}', resumeTarget.email)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeTarget(null)} disabled={resumeMutation.isPending}>
              {t['common.cancel']}
            </Button>
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={resumeMutation.isPending}
              onClick={() => resumeTarget && resumeMutation.mutate(resumeTarget.id)}
            >
              {resumeMutation.isPending ? t['admin.resuming'] : t['admin.resume']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Limits Dialog */}
      <Dialog open={!!editMailbox} onOpenChange={(open) => !open && setEditMailbox(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t['admin.editLimits']}</DialogTitle>
            {editMailbox && (
              <p className="text-sm text-slate-500 mt-1">{editMailbox.email}</p>
            )}
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) =>
              editMailbox && updateLimitsMutation.mutate({ id: editMailbox.id, limits: data })
            )}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label>{t['admin.dailyLimit']}</Label>
              <Input
                type="number"
                min={1}
                {...register('daily_email_limit', { valueAsNumber: true })}
                className={errors.daily_email_limit ? 'border-red-300' : ''}
              />
              {errors.daily_email_limit && (
                <p className="text-xs text-red-500">{errors.daily_email_limit.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t['admin.weeklyLimit']}</Label>
              <Input
                type="number"
                min={1}
                {...register('weekly_email_limit', { valueAsNumber: true })}
                className={errors.weekly_email_limit ? 'border-red-300' : ''}
              />
              {errors.weekly_email_limit && (
                <p className="text-xs text-red-500">{errors.weekly_email_limit.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMailbox(null)}>
                {t['common.cancel']}
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={updateLimitsMutation.isPending}
              >
                {updateLimitsMutation.isPending ? t['admin.savingLimits'] : t['admin.saveLimits']}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
