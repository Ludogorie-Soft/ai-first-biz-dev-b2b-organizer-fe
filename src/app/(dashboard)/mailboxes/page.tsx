'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getMailboxes, createMailbox, deleteMailbox } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface Mailbox {
  id: string
  email: string
  is_paused: boolean
  warmup_started_at: string
  created_at: string
}

const schema = z.object({
  email: z.string().email(),
  imap_host: z.string().min(1),
  imap_port: z.number().int().min(1),
  imap_user: z.string().min(1),
  imap_password: z.string().min(1),
  tls: z.boolean(),
})

type FormData = z.infer<typeof schema>

export default function MailboxesPage() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.mailboxes.all,
    queryFn: getMailboxes,
  })

  const mailboxes: Mailbox[] = data?.mailboxes || data || []

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tls: true, imap_port: 993 },
  })

  const tlsValue = watch('tls')

  const createMutation = useMutation({
    mutationFn: createMailbox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes.all })
      toast.success(t['common.success'])
      setAddOpen(false)
      reset()
    },
    onError: () => toast.error(t['common.error']),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMailbox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes.all })
      toast.success(t['common.success'])
      setDeleteId(null)
    },
    onError: () => toast.error(t['common.error']),
  })

  return (
    <div>
      <PageHeader
        title={t['mailboxes.title']}
        action={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t['mailboxes.add']}
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : mailboxes.length === 0 ? (
        <EmptyState
          title={t['mailboxes.noMailboxes']}
          description={t['mailboxes.noMailboxesDesc']}
          action={
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t['mailboxes.add']}
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['mailboxes.email']}
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['mailboxes.status']}
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
                  <TableCell>
                    <StatusBadge
                      status={mb.is_paused ? 'paused' : 'active'}
                      label={mb.is_paused ? t['mailboxes.paused'] : t['mailboxes.active']}
                    />
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {new Date(mb.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => setDeleteId(mb.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Mailbox Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t['mailboxes.add']}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) =>
              createMutation.mutate({
                email: data.email,
                imap_config: {
                  host: data.imap_host,
                  port: data.imap_port,
                  user: data.imap_user,
                  password: data.imap_password,
                  tls: data.tls,
                },
              })
            )}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>{t['mailboxes.email']}</Label>
              <Input type="email" {...register('email')} className={errors.email ? 'border-red-300' : ''} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t['mailboxes.imapHost']}</Label>
                <Input {...register('imap_host')} className={errors.imap_host ? 'border-red-300' : ''} />
              </div>
              <div className="space-y-1.5">
                <Label>{t['mailboxes.imapPort']}</Label>
                <Input type="number" {...register('imap_port', { valueAsNumber: true })} className={errors.imap_port ? 'border-red-300' : ''} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t['mailboxes.imapUser']}</Label>
              <Input {...register('imap_user')} className={errors.imap_user ? 'border-red-300' : ''} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>{t['mailboxes.imapPassword']}</Label>
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600" />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block w-72 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-lg">
                    For Gmail: Google Account → Security → 2-Step Verification → App Passwords. Generate an app password and use it here — not your regular Gmail password.
                  </div>
                </div>
              </div>
              <Input type="password" {...register('imap_password')} className={errors.imap_password ? 'border-red-300' : ''} />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="tls"
                checked={tlsValue}
                onChange={(e) => setValue('tls', e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Label htmlFor="tls" className="cursor-pointer">{t['mailboxes.tls']}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                {t['common.cancel']}
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? t['mailboxes.adding'] : t['common.save']}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
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
