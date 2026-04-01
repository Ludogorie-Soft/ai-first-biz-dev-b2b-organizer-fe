'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getSequences, deleteSequence } from '@/lib/api'
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
import { useState } from 'react'

interface Sequence {
  id: string
  name: string
  sequence_steps?: { id: string }[]
  step_count?: number
  created_at: string
}

export default function SequencesPage() {
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.sequences.all,
    queryFn: getSequences,
  })

  const sequences: Sequence[] = data?.sequences || data || []

  const deleteMutation = useMutation({
    mutationFn: deleteSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.all })
      toast.success(t['common.success'])
      setDeleteId(null)
    },
    onError: () => toast.error(t['common.error']),
  })

  return (
    <div>
      <PageHeader
        title={t['sequences.title']}
        action={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => router.push('/sequences/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t['sequences.new']}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <EmptyState
          title={t['sequences.noSequences']}
          description={t['sequences.noSequencesDesc']}
          action={
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => router.push('/sequences/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t['sequences.new']}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sequences.map((seq) => (
            <Card
              key={seq.id}
              className="border-slate-200 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => router.push(`/sequences/${seq.id}`)}
                  >
                    <h3 className="font-medium text-slate-900 truncate">{seq.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {seq.step_count ?? seq.sequence_steps?.length ?? 0} {t['sequences.steps']}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-slate-400 hover:text-red-500 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteId(seq.id)
                    }}
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
