'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { createCampaign, getTargetGroups, getSequences, getMailboxes } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  target_group_id: z.string().min(1),
  sequence_ids: z.array(z.string()).min(1),
  mailbox_ids: z.array(z.string()).min(1),
  send_on_weekends: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface TargetGroup { id: string; name: string }
interface Sequence { id: string; name: string }
interface Mailbox { id: string; email: string; status: string }

export default function NewCampaignPage() {
  const t = useTranslations()
  const router = useRouter()

  const { data: tgData } = useQuery({ queryKey: queryKeys.targetGroups.all, queryFn: getTargetGroups })
  const { data: seqData } = useQuery({ queryKey: queryKeys.sequences.all, queryFn: getSequences })
  const { data: mbData } = useQuery({ queryKey: queryKeys.mailboxes.all, queryFn: getMailboxes })

  const targetGroups: TargetGroup[] = tgData?.target_groups || tgData || []
  const sequences: Sequence[] = seqData?.sequences || seqData || []
  const mailboxes: Mailbox[] = mbData?.mailboxes || mbData || []

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mailbox_ids: [], sequence_ids: [], send_on_weekends: false },
  })

  const selectedMailboxIds = watch('mailbox_ids')
  const sendOnWeekends = watch('send_on_weekends')
  const selectedTargetGroupId = watch('target_group_id')
  const selectedSequenceIds = watch('sequence_ids')

  const mutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      toast.success(t['common.success'])
      router.push('/campaigns')
    },
    onError: () => toast.error(t['common.error']),
  })

  function toggleMailbox(id: string) {
    const current = selectedMailboxIds || []
    if (current.includes(id)) {
      setValue('mailbox_ids', current.filter((i) => i !== id))
    } else {
      setValue('mailbox_ids', [...current, id])
    }
  }

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

      <PageHeader title={t['campaigns.new']} />

      <Card className="max-w-2xl border-slate-200">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t['campaigns.name']}</Label>
              <Input id="name" {...register('name')} className={errors.name ? 'border-red-300' : ''} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                {t['campaigns.description']}{' '}
                <span className="text-slate-400 font-normal">({t['common.optional']})</span>
              </Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>

            <div className="space-y-1.5">
              <Label>{t['campaigns.targetGroup']}</Label>
              <Select onValueChange={(v: string | null) => { if (v) setValue('target_group_id', v, { shouldValidate: true }) }}>
                <SelectTrigger className={errors.target_group_id ? 'border-red-300' : ''}>
                  <span className={selectedTargetGroupId ? 'text-slate-900' : 'text-slate-400'}>
                    {selectedTargetGroupId
                      ? targetGroups.find((tg) => tg.id === selectedTargetGroupId)?.name
                      : t['campaigns.selectTargetGroup']}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {targetGroups.map((tg) => (
                    <SelectItem key={tg.id} value={tg.id}>
                      {tg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.target_group_id && <p className="text-xs text-red-500">{errors.target_group_id.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{t['campaigns.sequence']}</Label>
              <Select onValueChange={(v: string | null) => { if (v) setValue('sequence_ids', [v], { shouldValidate: true }) }}>
                <SelectTrigger className={errors.sequence_ids ? 'border-red-300' : ''}>
                  <span className={selectedSequenceIds?.[0] ? 'text-slate-900' : 'text-slate-400'}>
                    {selectedSequenceIds?.[0]
                      ? sequences.find((s) => s.id === selectedSequenceIds[0])?.name
                      : t['campaigns.selectSequence']}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {sequences.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sequence_ids && <p className="text-xs text-red-500">{errors.sequence_ids.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t['campaigns.mailboxes']}</Label>
              {mailboxes.length === 0 ? (
                <p className="text-sm text-slate-400">{t['mailboxes.noMailboxes']}</p>
              ) : (
                <div className="space-y-2 border border-slate-200 rounded-md p-3">
                  {mailboxes.map((mb) => (
                    <label key={mb.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMailboxIds?.includes(mb.id) || false}
                        onChange={() => toggleMailbox(mb.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">{mb.email}</span>
                    </label>
                  ))}
                </div>
              )}
              {errors.mailbox_ids && (
                <p className="text-xs text-red-500">{errors.mailbox_ids.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="send_on_weekends" className="text-slate-900">
                  {t['campaigns.sendOnWeekendsLabel']}
                </Label>
                <p className="text-xs text-slate-500">
                  {t['campaigns.sendOnWeekendsHint']}
                </p>
              </div>
              <Switch
                id="send_on_weekends"
                checked={sendOnWeekends ?? false}
                onCheckedChange={(v) => setValue('send_on_weekends', v, { shouldValidate: true })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/campaigns')}
              >
                {t['common.cancel']}
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t['campaigns.creating'] : t['common.save']}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
