'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ListChecks, RefreshCw } from 'lucide-react'
import { getAdminJobs, type AdminJobStatusFilter } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminJobsTable, type AdminJob, type JobStatus } from '@/components/admin/AdminJobsTable'

interface AdminJobsResponse {
  jobs: AdminJob[]
  counts: Record<JobStatus, number>
}

const STATUS_FILTERS: AdminJobStatusFilter[] = ['pending', 'processing', 'sent', 'failed', 'all']

export default function AdminJobsPage() {
  const t = useTranslations()
  const [status, setStatus] = useState<AdminJobStatusFilter>('pending')

  const { data, isLoading, isError, isFetching, refetch } = useQuery<AdminJobsResponse>({
    queryKey: queryKeys.admin.jobs(status),
    queryFn: () => getAdminJobs(status),
    refetchInterval: status === 'pending' || status === 'processing' ? 30_000 : false,
  })

  const jobs = data?.jobs ?? []
  const counts = data?.counts
  const totalCount = counts
    ? counts.pending + counts.processing + counts.sent + counts.failed
    : undefined
  const totalEmails = jobs.reduce((sum, j) => sum + Number(j.email_count), 0)

  return (
    <div>
      <PageHeader
        title={t['admin.jobs.title']}
        description={t['admin.jobs.description']}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            {t['admin.jobs.refresh']}
          </Button>
        }
      />

      <Tabs value={status} onValueChange={(v) => setStatus(v as AdminJobStatusFilter)}>
        <TabsList className="mb-6">
          {STATUS_FILTERS.map((s) => {
            const count = s === 'all' ? totalCount : counts?.[s]
            return (
              <TabsTrigger key={s} value={s} className="px-3">
                {t[`admin.jobs.status.${s}`]}
                {count !== undefined && (
                  <span className="ml-1.5 text-xs text-slate-400 tabular-nums">{count}</span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
          <p className="text-sm font-medium text-red-700">{t['common.error']}</p>
          <p className="mt-1 text-xs text-red-500">{t['admin.jobs.loadError']}</p>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title={t['admin.jobs.noJobs']}
          description={t['admin.jobs.noJobsDesc']}
          icon={<ListChecks className="h-10 w-10 text-slate-300" />}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            {totalEmails} {t['admin.jobs.totalEmails']}
          </p>
          <AdminJobsTable jobs={jobs} />
        </>
      )}
    </div>
  )
}
