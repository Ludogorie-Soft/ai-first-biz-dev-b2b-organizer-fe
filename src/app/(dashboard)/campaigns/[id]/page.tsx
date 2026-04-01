'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pause, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { getCampaign, getCampaignStats, updateCampaign, deleteCampaign } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'draft'
}

interface CampaignStats {
  sent: number
  pending: number
  replied: number
  failed: number
  reply_breakdown: {
    positive: number
    negative: number
    neutral: number
    out_of_office: number
  }
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: queryKeys.campaigns.single(id),
    queryFn: () => getCampaign(id),
  })

  const { data: stats, isLoading: statsLoading } = useQuery<CampaignStats>({
    queryKey: queryKeys.campaigns.stats(id),
    queryFn: () => getCampaignStats(id),
  })

  const updateMutation = useMutation({
    mutationFn: (status: string) => updateCampaign(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.single(id) })
      toast.success(t['common.success'])
    },
    onError: () => toast.error(t['common.error']),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all })
      toast.success(t['common.success'])
      router.push('/campaigns')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? t['common.error'])
    },
  })

  const statusLabel = (status: Campaign['status']) => {
    const map = {
      active: t['campaigns.active'],
      paused: t['campaigns.paused'],
      completed: t['campaigns.completed'],
      draft: t['campaigns.draft'],
    }
    return map[status] ?? status
  }

  if (campaignLoading) return <PageLoader />

  const replyBreakdown = [
    { label: t['campaigns.positive'], value: stats?.reply_breakdown?.positive ?? 0 },
    { label: t['campaigns.negative'], value: stats?.reply_breakdown?.negative ?? 0 },
    { label: t['campaigns.neutral'], value: stats?.reply_breakdown?.neutral ?? 0 },
    { label: t['campaigns.outOfOffice'], value: stats?.reply_breakdown?.out_of_office ?? 0 },
  ]

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/campaigns"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t['campaigns.backToCampaigns']}
        </Link>
      </div>

      <PageHeader
        title={campaign?.name ?? ''}
        action={
          <div className="flex items-center gap-3">
            {campaign && (
              <StatusBadge status={campaign.status} label={statusLabel(campaign.status)} />
            )}
            {campaign?.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateMutation.mutate('paused')}
                disabled={updateMutation.isPending}
              >
                <Pause className="h-4 w-4 mr-2" />
                {t['campaigns.pause']}
              </Button>
            )}
            {campaign?.status === 'paused' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate('active')}
                  disabled={updateMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {t['campaigns.resume']}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t['common.delete']}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))
        ) : (
          [
            { label: t['campaigns.sent'], value: stats?.sent ?? 0 },
            { label: t['campaigns.pending'], value: stats?.pending ?? 0 },
            { label: t['campaigns.replied'], value: stats?.replied ?? 0 },
            { label: t['campaigns.failed'], value: stats?.failed ?? 0 },
          ].map(({ label, value }) => (
            <Card key={label} className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500 mb-1">{label}</p>
                <p className="text-3xl font-semibold text-slate-900">{value}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t['common.confirmDelete']}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">{t['common.confirmDeleteDesc']}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t['common.cancel']}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {t['common.delete']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden max-w-md">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">{t['campaigns.replyBreakdown']}</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs font-medium text-slate-500 uppercase">
                {t['campaigns.replyType']}
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase text-right">
                {t['campaigns.count']}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {replyBreakdown.map(({ label, value }) => (
              <TableRow key={label}>
                <TableCell className="text-sm text-slate-700">{label}</TableCell>
                <TableCell className="text-sm font-medium text-slate-900 text-right">{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
