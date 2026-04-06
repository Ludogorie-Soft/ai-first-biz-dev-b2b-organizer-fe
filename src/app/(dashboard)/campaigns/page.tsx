'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCampaigns } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
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

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'draft'
  target_group?: { name: string }
  campaign_sequences?: { sequence: { name: string } | null }[]
  created_at: string
}

export default function CampaignsPage() {
  const t = useTranslations()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.campaigns.all,
    queryFn: () => getCampaigns(),
  })

  const campaigns: Campaign[] = data?.campaigns || data || []

  const statusLabel = (status: Campaign['status']) => {
    const map = {
      active: t['campaigns.active'],
      paused: t['campaigns.paused'],
      completed: t['campaigns.completed'],
      draft: t['campaigns.draft'],
    }
    return map[status] ?? status
  }

  return (
    <div>
      <PageHeader
        title={t['campaigns.title']}
        action={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => router.push('/campaigns/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t['campaigns.new']}
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title={t['campaigns.noCampaigns']}
          description={t['campaigns.noCampaignsDesc']}
          action={
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => router.push('/campaigns/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t['campaigns.new']}
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['campaigns.name']}
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['campaigns.status']}
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['campaigns.targetGroup']}
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['campaigns.sequence']}
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['common.createdAt']}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                >
                  <TableCell className="font-medium text-slate-900">
                    {campaign.name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={campaign.status}
                      label={statusLabel(campaign.status)}
                    />
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {campaign.target_group?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {campaign.campaign_sequences?.[0]?.sequence?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {new Date(campaign.created_at).toLocaleDateString()}
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
