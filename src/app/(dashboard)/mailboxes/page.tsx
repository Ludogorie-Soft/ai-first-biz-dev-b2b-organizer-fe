'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Info, Flame, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getMailboxes, createMailbox, updateMailbox, deleteMailbox } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { VariableEditor, normalizeBodyHtml } from '@/components/sequences/VariableEditor'
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
import { cn } from '@/lib/utils'

interface Mailbox {
  id: string
  email: string
  ses_status: 'pending' | 'active'
  is_paused: boolean
  warmup_started_at: string
  created_at: string
  daily_email_limit: number
  weekly_email_limit: number
  effective_daily_limit: number
  is_warming_up: boolean
  signature: string | null
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
  const [signatureMailbox, setSignatureMailbox] = useState<Mailbox | null>(null)
  const [signatureHtml, setSignatureHtml] = useState('')

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

  const signatureMutation = useMutation({
    mutationFn: ({ id, signature }: { id: string; signature: string | null }) =>
      updateMailbox(id, { signature }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mailboxes.all })
      toast.success(t['common.success'])
      setSignatureMailbox(null)
      setSignatureHtml('')
    },
    onError: () => toast.error(t['common.error']),
  })

  function openSignatureDialog(mb: Mailbox) {
    setSignatureMailbox(mb)
    setSignatureHtml(mb.signature || '')
  }

  function saveSignature() {
    if (!signatureMailbox) return
    const normalized = normalizeBodyHtml(signatureHtml)
    signatureMutation.mutate({
      id: signatureMailbox.id,
      signature: normalized || null,
    })
  }

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

      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-700">{t['mailboxes.healthCheckNotice']}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <a
            href="https://www.mail-tester.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Mail-Tester
          </a>
          <a
            href="https://www.mailgenius.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            MailGenius
          </a>
          <a
            href="https://mxtoolbox.com/emailhealth"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            MXToolbox Email Health
          </a>
        </div>
      </div>

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
                  {t['mailboxes.dailyLimit']}
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['mailboxes.weeklyLimit']}
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['mailboxes.createdAt']}
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {t['mailboxes.signature']}
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mailboxes.map((mb) => (
                <TableRow key={mb.id}>
                  <TableCell className="font-medium text-slate-900 text-sm">{mb.email}</TableCell>
                  <TableCell>
                    {mb.ses_status === 'pending' ? (
                      <StatusBadge status="draft" label={t['mailboxes.sesPending']} />
                    ) : (
                      <StatusBadge
                        status={mb.is_paused ? 'paused' : 'active'}
                        label={mb.is_paused ? t['mailboxes.paused'] : t['mailboxes.active']}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-900 font-medium">
                        {mb.effective_daily_limit ?? mb.daily_email_limit}
                      </span>
                      {mb.daily_email_limit && mb.effective_daily_limit !== mb.daily_email_limit && (
                        <span className="text-slate-400 text-xs">/ {mb.daily_email_limit}</span>
                      )}
                      {mb.is_warming_up && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                          title={t['mailboxes.warmingUpTooltip']}
                        >
                          <Flame className="h-3 w-3" />
                          {t['mailboxes.warmingUp']}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-900 text-sm font-medium">
                    {mb.weekly_email_limit ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {new Date(mb.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {mb.signature ? t['mailboxes.hasSignature'] : t['mailboxes.noSignature']}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-700"
                        onClick={() => openSignatureDialog(mb)}
                        title={t['mailboxes.editSignature']}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-500"
                        onClick={() => setDeleteId(mb.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Signature Dialog */}
      <Dialog
        open={!!signatureMailbox}
        onOpenChange={(open) => {
          if (!open) {
            setSignatureMailbox(null)
            setSignatureHtml('')
          }
        }}
      >
        <DialogContent
          className={cn(
            'flex w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0',
            'max-h-[90vh] sm:max-w-2xl',
          )}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
            <DialogTitle>
              {t['mailboxes.editSignature']}
              {signatureMailbox ? ` — ${signatureMailbox.email}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <p className="text-xs text-slate-400">{t['mailboxes.signatureHint']}</p>
            {signatureMailbox && (
              <VariableEditor
                key={signatureMailbox.id}
                value={signatureHtml}
                onChange={setSignatureHtml}
                rows={8}
              />
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSignatureMailbox(null)
                setSignatureHtml('')
              }}
            >
              {t['common.cancel']}
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={signatureMutation.isPending}
              onClick={saveSignature}
            >
              {signatureMutation.isPending
                ? t['mailboxes.savingSignature']
                : t['common.save']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="flex items-center gap-1.5">
                <Label>{t['mailboxes.email']}</Label>
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600" />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block w-72 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-lg">
                    {t['mailboxes.emailInfo']}
                  </div>
                </div>
              </div>
              <Input type="email" placeholder="sender-email@yourdomain.com" {...register('email')} className={errors.email ? 'border-red-300' : ''} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>{t['mailboxes.imapHost']}</Label>
                  <div className="relative group">
                    <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600" />
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block w-72 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-lg">
                      {t['mailboxes.imapHostInfo']}
                    </div>
                  </div>
                </div>
                <Input placeholder="mail.yourdomain.com" {...register('imap_host')} className={errors.imap_host ? 'border-red-300' : ''} />
              </div>
              <div className="space-y-1.5">
                <Label>{t['mailboxes.imapPort']}</Label>
                <Input type="number" {...register('imap_port', { valueAsNumber: true })} className={errors.imap_port ? 'border-red-300' : ''} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>{t['mailboxes.imapUser']}</Label>
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600" />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block w-72 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-lg">
                    {t['mailboxes.imapUserInfo']}
                  </div>
                </div>
              </div>
              <Input placeholder="sender-email@yourdomain.com" {...register('imap_user')} className={errors.imap_user ? 'border-red-300' : ''} />
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
