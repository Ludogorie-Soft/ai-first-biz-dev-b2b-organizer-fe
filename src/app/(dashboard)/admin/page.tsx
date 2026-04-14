'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { getAdminPendingMailboxes, approveMailbox } from '@/lib/api'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

export default function AdminPage() {
  const t = useTranslations()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'pending-mailboxes'],
    queryFn: getAdminPendingMailboxes,
  })

  const mailboxes: PendingMailbox[] = data || []

  const approveMutation = useMutation({
    mutationFn: approveMailbox,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-mailboxes'] })
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

  return (
    <div>
      <PageHeader title={t['admin.pendingMailboxes']} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : mailboxes.length === 0 ? (
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
              {mailboxes.map((mb) => (
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
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(mb.id)}
                    >
                      {approveMutation.isPending
                        ? t['admin.approving']
                        : t['admin.approve']}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
