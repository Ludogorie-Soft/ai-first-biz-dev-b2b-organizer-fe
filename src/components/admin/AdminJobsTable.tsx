'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type JobStatus = 'pending' | 'processing' | 'sent' | 'failed'

/** One "job" = queued emails sharing campaign + sender mailbox + sequence step + status. */
export interface AdminJob {
  campaign_id: string
  campaign_name: string | null
  campaign_status: string | null
  is_warmup: boolean
  company_id: string | null
  company_name: string | null
  mailbox_id: string
  sender_email: string | null
  sequence_id: string
  sequence_name: string | null
  step_id: string
  step_order: number | null
  status: JobStatus
  email_count: number | string // bigint may arrive as a string
  first_scheduled_at: string
  last_scheduled_at: string
  created_at: string
  last_updated_at: string
  error_count?: number | string
  errors?: string[]
}

const jobStatusStyles: Record<JobStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Single date, or "from – to" when the job's emails are spread over time. */
function formatRange(from: string, to: string): string {
  const a = formatDateTime(from)
  const b = formatDateTime(to)
  return a === b ? a : `${a} – ${b}`
}

const th = 'text-xs font-medium text-slate-500 uppercase tracking-wide'

interface AdminJobsTableProps {
  jobs: AdminJob[]
  showCampaign?: boolean
}

function jobKey(job: AdminJob): string {
  return `${job.campaign_id}-${job.mailbox_id}-${job.step_id}-${job.status}`
}

export function AdminJobsTable({ jobs, showCampaign = true }: AdminJobsTableProps) {
  const t = useTranslations()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const columnCount = showCampaign ? 10 : 9

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className={th}>{t['admin.jobs.sender']}</TableHead>
            <TableHead className={th}>{t['admin.company']}</TableHead>
            {showCampaign && <TableHead className={th}>{t['admin.jobs.campaign']}</TableHead>}
            <TableHead className={th}>{t['admin.jobs.step']}</TableHead>
            <TableHead className={`${th} text-right`}>{t['admin.jobs.emails']}</TableHead>
            <TableHead className={th}>{t['admin.jobs.status']}</TableHead>
            <TableHead className={th}>{t['admin.jobs.createdAt']}</TableHead>
            <TableHead className={th}>{t['admin.jobs.scheduled']}</TableHead>
            <TableHead className={th}>{t['admin.jobs.lastUpdated']}</TableHead>
            <TableHead className={th}>{t['admin.jobs.errors']}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const key = jobKey(job)
            const errorCount = Number(job.error_count ?? 0)
            const errors = job.errors ?? []
            const isOpen = expanded.has(key)
            return (
              <Fragment key={key}>
                <TableRow>
                  <TableCell className="font-medium text-slate-900 text-sm">
                    {job.sender_email ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{job.company_name ?? '—'}</TableCell>
                  {showCampaign && (
                    <TableCell className="text-sm">
                      {job.campaign_name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/campaigns/${job.campaign_id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            {job.campaign_name}
                          </Link>
                          {job.is_warmup && (
                            <Badge variant="outline" className="text-[10px] font-medium bg-violet-50 text-violet-700 border-violet-200">
                              {t['admin.jobs.warmup']}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-slate-500 text-sm">
                    {job.step_order != null ? `#${job.step_order}` : '—'}
                    {job.sequence_name && (
                      <span className="block text-xs text-slate-400">{job.sequence_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-slate-900 tabular-nums">
                    {Number(job.email_count)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs font-medium ${jobStatusStyles[job.status] ?? ''}`}>
                      {t[`admin.jobs.status.${job.status}`] ?? job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                    {formatDateTime(job.created_at)}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                    {formatRange(job.first_scheduled_at, job.last_scheduled_at)}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                    {formatDateTime(job.last_updated_at)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {errorCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700 hover:bg-red-100"
                        title={t['admin.jobs.showErrors']}
                      >
                        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <AlertCircle className="h-3 w-3" />
                        <span className="tabular-nums">{errorCount}</span>
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                </TableRow>
                {isOpen && errorCount > 0 && (
                  <TableRow className="bg-red-50/40 hover:bg-red-50/40">
                    <TableCell colSpan={columnCount} className="py-3">
                      <p className="mb-1.5 text-xs text-slate-500">
                        {errorCount} {t['admin.jobs.emailsWithErrors']}
                        {job.status === 'sent' && ` — ${t['admin.jobs.errorsRetriedNote']}`}
                      </p>
                      <ul className="space-y-1">
                        {errors.map((err, i) => (
                          <li
                            key={i}
                            className="whitespace-pre-wrap break-words rounded border border-red-200 bg-white px-2.5 py-1.5 font-mono text-xs text-red-700"
                          >
                            {err}
                          </li>
                        ))}
                      </ul>
                      {errors.length >= 5 && (
                        <p className="mt-1.5 text-xs text-slate-400">{t['admin.jobs.errorsTruncated']}</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
