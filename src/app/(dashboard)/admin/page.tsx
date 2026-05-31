'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, Pencil } from 'lucide-react'
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
} from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
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

interface MailboxLimit {
  id: string
  email: string
  company_id: string
  company_name: string
  daily_email_limit: number
  weekly_email_limit: number
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

  function openEdit(mb: MailboxLimit) {
    setEditMailbox(mb)
    reset({ daily_email_limit: mb.daily_email_limit, weekly_email_limit: mb.weekly_email_limit })
  }

  return (
    <div>
      <PageHeader title={t['admin.title']} />

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
                      <TableCell className="font-medium text-slate-900 text-sm">{mb.email}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{mb.company_name}</TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={
                            mb.sent_today >= mb.daily_email_limit
                              ? 'text-red-600 font-semibold'
                              : mb.sent_today >= mb.daily_email_limit * 0.8
                              ? 'text-amber-600 font-medium'
                              : 'text-slate-700'
                          }
                        >
                          {mb.sent_today}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm font-medium">
                        {mb.daily_email_limit}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-indigo-600"
                          onClick={() => openEdit(mb)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
