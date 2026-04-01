'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { createSequence } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

const schema = z.object({
  name: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export default function NewSequencePage() {
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: createSequence,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.all })
      const id = data.sequence?.id || data.id
      toast.success(t['common.success'])
      router.push(`/sequences/${id}`)
    },
    onError: () => toast.error(t['common.error']),
  })

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/sequences"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t['sequences.backToSequences']}
        </Link>
      </div>

      <PageHeader title={t['sequences.new']} />

      <Card className="max-w-lg border-slate-200">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t['sequences.name']}</Label>
              <Input
                id="name"
                {...register('name')}
                className={errors.name ? 'border-red-300' : ''}
                autoFocus
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/sequences')}
              >
                {t['common.cancel']}
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t['sequences.creating'] : t['common.save']}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
