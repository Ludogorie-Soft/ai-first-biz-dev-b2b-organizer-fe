'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { getTargetGroup, getCampaigns } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'

interface TargetGroup {
  id: string
  name: string
  description?: string
}

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'draft'
  leads?: { count: number }[]
}

export default function TargetGroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations()
  const router = useRouter()

  const { data: group, isLoading: groupLoading } = useQuery<TargetGroup>({
    queryKey: queryKeys.targetGroups.single(id),
    queryFn: () => getTargetGroup(id),
  })

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: queryKeys.campaigns.all,
    queryFn: () => getCampaigns({ target_group_id: id }),
  })

  const campaigns: Campaign[] = campaignsData || []

  const statusLabel = (status: Campaign['status']) => {
    const map = {
      active: t['campaigns.active'],
      paused: t['campaigns.paused'],
      completed: t['campaigns.completed'],
      draft: t['campaigns.draft'],
    }
    return map[status] ?? status
  }

  if (groupLoading) return <PageLoader />

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/target-groups"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t['targetGroups.backToGroups']}
        </Link>
      </div>

      <PageHeader title={group?.name ?? ''} />

      {group?.description && (
        <p className="text-sm text-slate-500 mb-6 -mt-2">{group.description}</p>
      )}

      {campaignsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title={t['campaigns.noCampaigns']}
          description={t['campaigns.noCampaignsDesc']}
          icon={<Megaphone className="h-6 w-6 text-slate-400" />}
        />
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="border-slate-200 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{campaign.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {campaign.leads?.[0]?.count ?? 0} {t['targetGroups.leads']}
                  </p>
                </div>
                <StatusBadge status={campaign.status} label={statusLabel(campaign.status)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
