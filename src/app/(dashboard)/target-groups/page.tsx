'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { getTargetGroups, deleteTargetGroup } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface TargetGroup {
  id: string
  name: string
  description?: string
  campaigns?: { count: number }[]
  created_at: string
}

export default function TargetGroupsPage() {
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.targetGroups.all,
    queryFn: getTargetGroups,
  })

  const groups: TargetGroup[] = data?.target_groups || data || []

  const deleteMutation = useMutation({
    mutationFn: deleteTargetGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targetGroups.all })
      toast.success(t['common.success'])
      setDeleteId(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? t['common.error'])
      setDeleteId(null)
    },
  })

  return (
    <div>
      <PageHeader
        title={t['targetGroups.title']}
        action={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => router.push('/target-groups/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t['targetGroups.new']}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title={t['targetGroups.noGroups']}
          description={t['targetGroups.noGroupsDesc']}
          icon={<Users className="h-6 w-6 text-slate-400" />}
          action={
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => router.push('/target-groups/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t['targetGroups.new']}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{group.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <Link
                        href={`/target-groups/${group.id}`}
                        className="text-xs text-indigo-600 hover:underline font-medium"
                      >
                        {group.campaigns?.[0]?.count ?? 0} {t['nav.campaigns']}
                      </Link>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-slate-400 hover:text-red-500 flex-shrink-0"
                    onClick={() => setDeleteId(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t['common.confirmDelete']}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">{t['common.confirmDeleteDesc']}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t['common.cancel']}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {t['common.delete']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
