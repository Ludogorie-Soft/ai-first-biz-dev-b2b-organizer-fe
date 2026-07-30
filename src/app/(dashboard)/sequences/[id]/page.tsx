'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Pencil, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getSequence,
  addStep,
  updateStep,
  deleteStep,
  uploadStepAttachment,
  deleteStepAttachment,
  updateSequence,
  getMailboxes,
} from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import {
  VariableEditor,
  stripHtml,
  type VariableEditorHandle,
} from '@/components/sequences/VariableEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{full_name}}', '{{company_name}}', '{{position}}'] as const
const MAX_ATTACHMENTS = 3
const ACCEPT_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt'

interface StepAttachment {
  id: string
  file_name: string
  content_type: string
  size_bytes: number
  storage_path: string
}

interface Step {
  id: string
  subject: string
  body: string
  delay_days: number
  step_order: number
  sequence_step_attachments?: StepAttachment[]
}

interface MailboxOption {
  id: string
  email: string
  signature: string | null
}

const stepSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  delay_days: z.number().min(0),
  step_order: z.number().min(1),
})

type StepFormData = z.infer<typeof stepSchema>

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<Step | null>(null)
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [previewMailboxId, setPreviewMailboxId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.sequences.single(id),
    queryFn: () => getSequence(id),
  })

  const { data: mailboxesData } = useQuery({
    queryKey: queryKeys.mailboxes.all,
    queryFn: getMailboxes,
  })

  const mailboxes: MailboxOption[] = mailboxesData?.mailboxes || mailboxesData || []
  const includeSignature =
    (data as { include_signature?: boolean } | undefined)?.include_signature !== false
  const steps: Step[] = (data as { sequence_steps?: Step[] } | undefined)?.sequence_steps ?? []

  useEffect(() => {
    if (mailboxes.length === 0) {
      setPreviewMailboxId('')
      return
    }
    if (!previewMailboxId || !mailboxes.some((m) => m.id === previewMailboxId)) {
      setPreviewMailboxId(mailboxes[0].id)
    }
  }, [mailboxes, previewMailboxId])

  const previewMailbox = mailboxes.find((m) => m.id === previewMailboxId) || mailboxes[0]
  const previewSignature = previewMailbox?.signature?.trim() || ''

  const subjectInputRef = useRef<HTMLInputElement>(null)
  const bodyEditorRef = useRef<VariableEditorHandle>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<StepFormData>({ resolver: zodResolver(stepSchema) })

  function insertVariable(variable: string) {
    const active = document.activeElement
    if (active === subjectInputRef.current) {
      const input = subjectInputRef.current
      const start = input?.selectionStart ?? (getValues('subject') || '').length
      const end = input?.selectionEnd ?? start
      const current = getValues('subject') || ''
      setValue('subject', current.slice(0, start) + variable + current.slice(end), { shouldValidate: true })
      requestAnimationFrame(() => {
        if (input) input.selectionStart = input.selectionEnd = start + variable.length
      })
    } else {
      bodyEditorRef.current?.insertVariable(variable)
    }
  }

  function openAddDialog() {
    setEditingStep(null)
    setPendingFiles([])
    const nextStepOrder = steps.length === 0 ? 1 : Math.max(...steps.map((s) => s.step_order)) + 1
    reset({ step_order: nextStepOrder, delay_days: steps.length === 0 ? 0 : 1 })
    setDialogOpen(true)
  }

  function openEditDialog(step: Step) {
    setEditingStep(step)
    setPendingFiles([])
    reset({
      subject: step.subject,
      body: step.body,
      delay_days: step.delay_days,
      step_order: step.step_order,
    })
    setDialogOpen(true)
  }

  const existingAttachments = editingStep?.sequence_step_attachments ?? []
  const attachmentSlotsUsed = existingAttachments.length + pendingFiles.length

  function onPickFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const remaining = MAX_ATTACHMENTS - attachmentSlotsUsed
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments per step`)
      return
    }
    const next = [...pendingFiles, ...Array.from(fileList)].slice(0, MAX_ATTACHMENTS - existingAttachments.length)
    setPendingFiles(next)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadPending(stepId: string, files: File[]) {
    for (const file of files) {
      await uploadStepAttachment(id, stepId, file)
    }
  }

  const addMutation = useMutation({
    mutationFn: async (formData: StepFormData) => {
      const created = await addStep(id, formData) as { id: string }
      if (pendingFiles.length > 0) {
        setUploading(true)
        try {
          await uploadPending(created.id, pendingFiles)
        } finally {
          setUploading(false)
        }
      }
      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(id) })
      toast.success(t['common.success'])
      setPendingFiles([])
      setDialogOpen(false)
    },
    onError: () => toast.error(t['common.error']),
  })

  const updateMutation = useMutation({
    mutationFn: async (formData: StepFormData) => {
      const updated = await updateStep(id, editingStep!.id, formData)
      if (pendingFiles.length > 0) {
        setUploading(true)
        try {
          await uploadPending(editingStep!.id, pendingFiles)
        } finally {
          setUploading(false)
        }
      }
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(id) })
      toast.success(t['common.success'])
      setPendingFiles([])
      setDialogOpen(false)
    },
    onError: () => toast.error(t['common.error']),
  })

  const deleteMutation = useMutation({
    mutationFn: (stepId: string) => deleteStep(id, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(id) })
      toast.success(t['common.success'])
      setDeleteStepId(null)
    },
    onError: () => toast.error(t['common.error']),
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      deleteStepAttachment(id, editingStep!.id, attachmentId),
    onSuccess: (_data, attachmentId) => {
      setEditingStep((prev) =>
        prev
          ? {
              ...prev,
              sequence_step_attachments: (prev.sequence_step_attachments || []).filter(
                (a) => a.id !== attachmentId
              ),
            }
          : prev
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(id) })
      toast.success(t['common.success'])
    },
    onError: () => toast.error(t['common.error']),
  })

  const includeSignatureMutation = useMutation({
    mutationFn: (include_signature: boolean) => updateSequence(id, { include_signature }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(id) })
    },
    onError: () => toast.error(t['common.error']),
  })

  if (isLoading) return <PageLoader />

  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order)
  const saving = addMutation.isPending || updateMutation.isPending || uploading

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

      <PageHeader
        title={data?.name ?? ''}
        action={
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <Switch
                checked={includeSignature}
                disabled={includeSignatureMutation.isPending}
                onCheckedChange={(checked) => includeSignatureMutation.mutate(checked)}
              />
              <span>{t['sequences.includeSignature']}</span>
            </label>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={openAddDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t['sequences.addStep']}
            </Button>
          </div>
        }
      />
      <p className="mb-4 -mt-2 text-xs text-slate-400 max-w-2xl">
        {t['sequences.includeSignatureHint']}
      </p>

      {sortedSteps.length === 0 ? (
        <EmptyState
          title={t['sequences.noSteps']}
          description={t['sequences.noStepsDesc']}
          action={
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={openAddDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t['sequences.addStep']}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3 max-w-2xl">
          {sortedSteps.map((step) => {
            const count = step.sequence_step_attachments?.length ?? 0
            return (
              <Card key={step.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center">
                        <span className="text-xs font-semibold text-indigo-600">
                          {step.step_order}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{step.subject}</p>
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                          {stripHtml(step.body)}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <p className="text-xs text-slate-400">
                            {t['sequences.waitDays']}: {step.delay_days} {t['sequences.days']}
                          </p>
                          {count > 0 && (
                            <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {count} {t['sequences.attachmentCount']}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                        onClick={() => openEditDialog(step)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => setDeleteStepId(step.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Button
            variant="outline"
            className="w-full border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
            onClick={openAddDialog}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t['sequences.addStep']}
          </Button>
        </div>
      )}

      {/* Add/Edit Step Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={cn(
            'flex w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0',
            'max-h-[90vh] sm:max-w-4xl lg:max-w-5xl',
          )}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
            <DialogTitle>
              {editingStep ? t['sequences.editStep'] : t['sequences.addStep']}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((formData: StepFormData) => {
              if (editingStep) updateMutation.mutate(formData)
              else addMutation.mutate(formData)
            })}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t['sequences.stepOrder']}</Label>
                      <Input
                        type="number"
                        min="1"
                        disabled={!editingStep}
                        {...register('step_order', { valueAsNumber: true })}
                        className={errors.step_order ? 'border-red-300' : ''}
                      />
                      {!editingStep && (
                        <p className="text-xs text-slate-400">{t['sequences.autoCalculated']}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t['sequences.delayDays']}</Label>
                      <Input
                        type="number"
                        min="0"
                        {...register('delay_days', { valueAsNumber: true })}
                        className={errors.delay_days ? 'border-red-300' : ''}
                      />
                      <p className="text-xs text-slate-400">{t['sequences.delayHint']}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t['sequences.subject']}</Label>
                    <Input
                      {...register('subject')}
                      ref={(el) => {
                        register('subject').ref(el)
                        subjectInputRef.current = el
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const variable = e.dataTransfer.getData('text/plain')
                        if (variable?.startsWith('{{')) insertVariable(variable)
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      className={errors.subject ? 'border-red-300' : ''}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-500">{t['sequences.variables']}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {VARIABLES.map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', variable)}
                          onClick={() => insertVariable(variable)}
                          className="cursor-grab active:cursor-grabbing px-2 py-0.5 rounded text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors select-none"
                          title="Click to insert · Drag to field"
                        >
                          {variable}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">{t['sequences.variablesHint']}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t['sequences.attachments']}</Label>
                    <p className="text-xs text-slate-400">{t['sequences.attachmentsHint']}</p>

                    <ul className="space-y-1.5">
                      {existingAttachments.map((att) => (
                        <li
                          key={att.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
                        >
                          <span className="truncate text-slate-700">
                            <Paperclip className="inline h-3.5 w-3.5 mr-1.5 text-slate-400" />
                            {att.file_name}
                            <span className="ml-2 text-xs text-slate-400">{formatBytes(att.size_bytes)}</span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                            disabled={deleteAttachmentMutation.isPending}
                            onClick={() => deleteAttachmentMutation.mutate(att.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                      {pendingFiles.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-dashed border-indigo-200 bg-indigo-50/40 px-2.5 py-1.5 text-sm"
                        >
                          <span className="truncate text-slate-700">
                            <Paperclip className="inline h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                            {file.name}
                            <span className="ml-2 text-xs text-slate-400">{formatBytes(file.size)}</span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                            onClick={() =>
                              setPendingFiles((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>

                    {attachmentSlotsUsed === 0 && (
                      <p className="text-xs text-slate-400">{t['sequences.noAttachments']}</p>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_TYPES}
                      className="hidden"
                      onChange={(e) => onPickFiles(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={attachmentSlotsUsed >= MAX_ATTACHMENTS}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {t['sequences.addAttachment']}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 lg:min-h-0">
                  <Label>{t['sequences.body']}</Label>
                  <Controller
                    name="body"
                    control={control}
                    render={({ field }) => (
                      <VariableEditor
                        key={editingStep?.id ?? 'new-step'}
                        ref={bodyEditorRef}
                        value={field.value || ''}
                        onChange={field.onChange}
                        hasError={!!errors.body}
                        rows={12}
                      />
                    )}
                  />

                  {includeSignature && (
                    <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label className="text-slate-700">{t['sequences.signaturePreview']}</Label>
                        {mailboxes.length > 1 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {t['sequences.signaturePreviewMailbox']}
                            </span>
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                              value={previewMailboxId}
                              onChange={(e) => setPreviewMailboxId(e.target.value)}
                            >
                              {mailboxes.map((mb) => (
                                <option key={mb.id} value={mb.id}>
                                  {mb.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      {previewSignature ? (
                        <div
                          className="sequence-body-editor rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700"
                          dangerouslySetInnerHTML={{ __html: previewSignature }}
                        />
                      ) : (
                        <p className="text-xs text-slate-400">
                          {t['sequences.signaturePreviewEmpty']}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">{t['sequences.signaturePreviewNote']}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t['common.cancel']}
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={saving}
              >
                {saving
                  ? uploading
                    ? t['sequences.uploading']
                    : t['sequences.saving']
                  : t['common.save']}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t['common.confirmDelete']}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">{t['common.confirmDeleteDesc']}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStepId(null)}>
              {t['common.cancel']}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteStepId && deleteMutation.mutate(deleteStepId)}
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
