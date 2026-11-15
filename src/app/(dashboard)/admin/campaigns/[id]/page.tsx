'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getAdminCampaign } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminJobsTable, type AdminJob, type JobStatus } from '@/components/admin/AdminJobsTable'

type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft' | 'pending_mailbox_approval'
type LeadStatus = 'active' | 'replied' | 'unsubscribed' | 'bounced' | 'opted_out'

interface AdminCampaign {
  id: string
  name: string
  description: string | null
  status: CampaignStatus
  send_on_weekends: boolean
  is_warmup: boolean
  created_at: string
  company: { id: string; name: string } | null
  sequences: {
    id: string
    name: string
    sequence_steps: { id: string; step_order: number; subject: string; delay_days: number }[]
  }[]
  mailboxes: {
    id: string
    email: string
    ses_status: 'pending' | 'active'
    is_paused: boolean
    daily_email_limit: number
    weekly_email_limit: number
  }[]
  lead_counts: { total: number; by_status: Partial<Record<LeadStatus, number>> }
  email_stats: { sent: number; failed: number; bounced: number; replied: number }
  queue_counts: Record<JobStatus, number>
  jobs: AdminJob[]
}

const campaignStatusKey = {
  active: 'campaigns.active',
  paused: 'campaigns.paused',
  completed: 'campaigns.completed',
  draft: 'campaigns.draft',
  pending_mailbox_approval: 'campaigns.pendingMailboxApproval',
} as const

const leadStatusKey = {
  active: 'admin.campaign.lead.active',
  replied: 'admin.campaign.lead.replied',
  unsubscribed: 'admin.campaign.lead.unsubscribed',
  bounced: 'admin.campaign.lead.bounced',
  opted_out: 'admin.campaign.lead.optedOut',
} as const

const th = 'text-xs font-medium text-slate-500 uppercase tracking-wide'

function Stat({ label, value, tone = 'text-slate-900' }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

export default function AdminCampaignPage() {
  const t = useTranslations()
  const { id } = useParams<{ id: string }>()

  const { data: campaign, isLoading, isError } = useQuery<AdminCampaign>({
    queryKey: queryKeys.admin.campaign(id),
    queryFn: () => getAdminCampaign(id),
    enabled: !!id,
  })

  const backLink = (
    <Link
      href="/admin/jobs"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {t['admin.campaign.backToJobs']}
    </Link>
  )

  if (isLoading) return <PageLoader />

  if (isError || !campaign) {
    return (
      <div>
        {backLink}
        <EmptyState title={t['admin.campaign.notFound']} />
      </div>
    )
  }

  return (
    <div>
      {backLink}

      <PageHeader
        title={campaign.name}
        description={campaign.description ?? undefined}
        action={
          <div className="flex items-center gap-2">
            {campaign.is_warmup && (
              <Badge variant="outline" className="text-xs font-medium bg-violet-50 text-violet-700 border-violet-200">
                {t['admin.jobs.warmup']}
              </Badge>
            )}
            <StatusBadge
              status={campaign.status}
              label={t[campaignStatusKey[campaign.status]] ?? campaign.status}
            />
          </div>
        }
      />

      {/* Overview + stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t['admin.campaign.overview']}
            </p>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">{t['admin.company']}</span>
              <span className="font-medium text-slate-900 text-right">{campaign.company?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">{t['admin.campaign.createdAt']}</span>
              <span className="text-slate-900">{new Date(campaign.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">{t['admin.campaign.sendOnWeekends']}</span>
              <span className="text-slate-900">
                {campaign.send_on_weekends ? t['admin.campaign.yes'] : t['admin.campaign.no']}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t['admin.campaign.leads']}
            </p>
            <Stat label={t['admin.campaign.leadsTotal']} value={campaign.lead_counts.total} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(leadStatusKey) as LeadStatus[])
                .filter((s) => (campaign.lead_counts.by_status[s] ?? 0) > 0)
                .map((s) => (
                  <StatusBadge
                    key={s}
                    status={s}
                    label={`${t[leadStatusKey[s]] ?? s}: ${campaign.lead_counts.by_status[s]}`}
                  />
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t['admin.campaign.emailStats']}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t['admin.campaign.sent']} value={campaign.email_stats.sent} tone="text-emerald-700" />
              <Stat label={t['admin.campaign.replied']} value={campaign.email_stats.replied} tone="text-blue-700" />
              <Stat label={t['admin.campaign.failed']} value={campaign.email_stats.failed} tone="text-red-700" />
              <Stat label={t['admin.campaign.bounced']} value={campaign.email_stats.bounced} tone="text-orange-700" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t['admin.campaign.queue']}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t['admin.jobs.status.pending']} value={campaign.queue_counts.pending} tone="text-amber-700" />
              <Stat label={t['admin.jobs.status.processing']} value={campaign.queue_counts.processing} tone="text-blue-700" />
              <Stat label={t['admin.jobs.status.sent']} value={campaign.queue_counts.sent} tone="text-emerald-700" />
              <Stat label={t['admin.jobs.status.failed']} value={campaign.queue_counts.failed} tone="text-red-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mailboxes */}
      <Section title={t['admin.campaign.mailboxes']}>
        {campaign.mailboxes.length === 0 ? (
          <p className="text-sm text-slate-400">{t['admin.campaign.noMailboxes']}</p>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className={th}>{t['common.email']}</TableHead>
                  <TableHead className={th}>{t['admin.campaign.sesStatus']}</TableHead>
                  <TableHead className={th}>{t['admin.campaign.limits']}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.mailboxes.map((mb) => (
                  <TableRow key={mb.id}>
                    <TableCell className="font-medium text-slate-900 text-sm">
                      {mb.email}
                      {mb.is_paused && (
                        <span className="ml-2">
                          <StatusBadge status="paused" label={t['admin.campaign.paused']} />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <StatusBadge
                        status={mb.ses_status === 'active' ? 'active' : 'pending_mailbox_approval'}
                        label={mb.ses_status}
                      />
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm tabular-nums">
                      {mb.daily_email_limit} / {mb.weekly_email_limit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/* Sequences */}
      <Section title={t['admin.campaign.sequences']}>
        {campaign.sequences.length === 0 ? (
          <p className="text-sm text-slate-400">{t['admin.campaign.noSequences']}</p>
        ) : (
          <div className="space-y-4">
            {campaign.sequences.map((seq) => (
              <div key={seq.id} className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                <p className="px-4 py-2.5 text-sm font-medium text-slate-900 border-b border-slate-200">
                  {seq.name}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className={`${th} w-16`}>{t['admin.jobs.step']}</TableHead>
                      <TableHead className={th}>{t['admin.campaign.subject']}</TableHead>
                      <TableHead className={`${th} w-32`}>{t['admin.campaign.delayDays']}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seq.sequence_steps.map((step) => (
                      <TableRow key={step.id}>
                        <TableCell className="text-slate-500 text-sm">#{step.step_order}</TableCell>
                        <TableCell className="text-slate-900 text-sm">{step.subject}</TableCell>
                        <TableCell className="text-slate-500 text-sm tabular-nums">{step.delay_days}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Jobs for this campaign */}
      <Section title={t['admin.campaign.jobs']}>
        {campaign.jobs.length === 0 ? (
          <p className="text-sm text-slate-400">{t['admin.jobs.noJobs']}</p>
        ) : (
          <AdminJobsTable jobs={campaign.jobs} showCampaign={false} />
        )}
      </Section>
    </div>
  )
}
