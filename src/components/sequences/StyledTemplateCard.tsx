'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileCode2, Pencil, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  addStep,
  deleteSequenceTemplate,
  updateSequenceTemplate,
  uploadSequenceTemplate,
} from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StyledHtmlEditor, type StyledHtmlEditorHandle } from './StyledHtmlEditor'
import { VariableChips } from './VariableChips'

const ACCEPT_TYPES = '.html,.htm,.eml'
const MAX_FILE_BYTES = 4 * 1024 * 1024

export interface SequenceTemplate {
  id: string
  name: string
  file_name: string | null
  html: string
  created_at?: string
}

interface PendingUpload {
  id: string
  file: File
  subject: string
}

interface UploadedTemplate extends SequenceTemplate {
  warnings?: { removedTrackingPixels: number; removedEmbeddedImages: number }
}

function caretIndexFromPoint(input: HTMLInputElement, clientX: number, clientY: number): number {
  const doc = input.ownerDocument as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  const range = doc.caretRangeFromPoint?.(clientX, clientY)
  if (range && (range.startContainer === input || input.contains(range.startContainer))) {
    return range.startOffset
  }
  const pos = doc.caretPositionFromPoint?.(clientX, clientY)
  if (pos && (pos.offsetNode === input || input.contains(pos.offsetNode))) {
    return pos.offset
  }
  return input.selectionStart ?? input.value.length
}

/** The API explains rejected files (type, size), and that reason is what the user needs. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error
  return typeof message === 'string' ? message : fallback
}

export function StyledTemplateCard({
  sequenceId,
  templates,
  nextStepOrder,
  hasSteps,
}: {
  sequenceId: string
  templates: SequenceTemplate[]
  nextStepOrder: number
  hasSteps: boolean
}) {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<StyledHtmlEditorHandle>(null)
  const [draft, setDraft] = useState<{ id: string; html: string } | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [draftSubject, setDraftSubject] = useState('')
  const [pending, setPending] = useState<PendingUpload[]>([])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(sequenceId) })

  function openEditor(template: { id: string; html: string }) {
    setDraft({ id: template.id, html: template.html })
    setEditorKey((key) => key + 1)
  }

  function reportUploadWarnings(result: UploadedTemplate) {
    if (result.warnings?.removedTrackingPixels) {
      toast.info(
        t['sequences.templateTrackersRemoved'].replace(
          '{count}',
          String(result.warnings.removedTrackingPixels),
        ),
      )
    }
    if (result.warnings?.removedEmbeddedImages) {
      toast.warning(
        t['sequences.templateImagesRemoved'].replace(
          '{count}',
          String(result.warnings.removedEmbeddedImages),
        ),
      )
    }
  }

  function closeUpload() {
    if (uploading) return
    setUploadOpen(false)
    setPending([])
    setDraftSubject('')
  }

  function stageFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])
    if (inputRef.current) inputRef.current.value = ''
    const accepted: PendingUpload[] = []
    files.forEach((file, index) => {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name}: ${t['sequences.templateTooLarge']}`)
        return
      }
      accepted.push({
        id: `${file.name}-${file.lastModified}-${index}`,
        file,
        subject: '',
      })
    })
    if (accepted.length === 0) return
    const carried = pending[0]?.subject || draftSubject
    accepted[0].subject = carried
    setPending(accepted)
    setUploadOpen(true)
  }

  async function createSteps() {
    if (pending.length === 0 || pending.some((item) => !item.subject.trim())) return
    setUploading(true)
    let order = nextStepOrder
    let isFirst = !hasSteps
    const leftover: PendingUpload[] = []
    let failed = false
    for (const item of pending) {
      if (failed) {
        leftover.push(item)
        continue
      }
      try {
        const result = (await uploadSequenceTemplate(sequenceId, item.file)) as UploadedTemplate
        reportUploadWarnings(result)
        await addStep(sequenceId, {
          step_order: order,
          delay_days: isFirst ? 0 : 1,
          subject: item.subject.trim(),
          use_template: true,
          template_id: result.id,
          styled_html: result.html,
        })
        order += 1
        isFirst = false
      } catch (err) {
        failed = true
        leftover.push(item)
        toast.error(`${item.file.name}: ${apiErrorMessage(err, t['common.error'])}`)
      }
    }
    setUploading(false)
    invalidate()
    if (!failed) {
      toast.success(t['common.success'])
      setUploadOpen(false)
      setPending([])
      setDraftSubject('')
    } else {
      setPending(leftover)
    }
  }

  const saveMutation = useMutation({
    mutationFn: (next: { id: string; html: string }) =>
      updateSequenceTemplate(sequenceId, next.id, { html: next.html }),
    onSuccess: () => {
      invalidate()
      toast.success(t['common.success'])
      setDraft(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err, t['common.error'])),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateSequenceTemplate(sequenceId, id, { name }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(apiErrorMessage(err, t['common.error'])),
  })

  const removeMutation = useMutation({
    mutationFn: (templateId: string) => deleteSequenceTemplate(sequenceId, templateId),
    onSuccess: () => {
      invalidate()
      toast.success(t['common.success'])
      setConfirmingRemoveId(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err, t['common.error'])),
  })

  function insertVariable(variable: string) {
    if (!editorRef.current?.insertVariable(variable)) {
      toast.info(t['sequences.templateClickFirst'])
    }
  }

  const editing = templates.find((template) => template.id === draft?.id)

  return (
    <>
      <Card className="mb-4 max-w-2xl border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileCode2 className="h-5 w-5 flex-shrink-0 text-indigo-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{t['sequences.template']}</p>
                {templates.length === 0 && (
                  <p className="truncate text-xs text-slate-500">{t['sequences.templateNone']}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_TYPES}
                multiple
                className="hidden"
                onChange={(e) => stageFiles(e.target.files)}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {uploading ? t['sequences.uploading'] : t['sequences.templateUpload']}
              </Button>
            </div>
          </div>

          {templates.length > 0 && (
            <ul className="mt-3 space-y-2">
              {templates.map((template) => (
                <TemplateRow
                  key={template.id}
                  template={template}
                  onRename={(name) => renameMutation.mutateAsync({ id: template.id, name })}
                  onEdit={() => openEditor(template)}
                  onRemove={() => setConfirmingRemoveId(template.id)}
                />
              ))}
            </ul>
          )}

          <p className="mt-2 text-xs text-slate-400">
            {templates.length > 0 ? t['sequences.templateCopyHint'] : t['sequences.templateUploadHint']}
          </p>
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={(open) => !open && closeUpload()}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
            <DialogTitle>{t['sequences.templateAddStepTitle']}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p className="text-xs text-slate-500">{t['sequences.templateStepHint']}</p>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {t['sequences.templateChooseFile']}
              </Button>
            </div>
            {pending.length === 0 ? (
              <SubjectWithVariables
                label={t['sequences.subject']}
                value={draftSubject}
                onChange={setDraftSubject}
                autoFocus
              />
            ) : (
              pending.map((item, index) => (
                <div key={item.id} className="space-y-2">
                  <p className="truncate text-sm font-medium text-slate-700">{item.file.name}</p>
                  <SubjectWithVariables
                    label={t['sequences.subject']}
                    value={item.subject}
                    autoFocus={index === 0}
                    onChange={(subject) =>
                      setPending((rows) =>
                        rows.map((row) => (row.id === item.id ? { ...row, subject } : row)),
                      )
                    }
                  />
                </div>
              ))
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none">
            <Button variant="outline" disabled={uploading} onClick={closeUpload}>
              {t['common.cancel']}
            </Button>
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={
                uploading || pending.length === 0 || pending.some((item) => !item.subject.trim())
              }
              onClick={() => void createSteps()}
            >
              {uploading ? t['sequences.uploading'] : t['sequences.addStep']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
            <DialogTitle>
              {t['sequences.templateEditorTitle']}
              {editing ? ` — ${editing.name}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <p className="text-xs text-slate-500">{t['sequences.templateEditorHint']}</p>
            <VariableChips onInsert={insertVariable} />
            {draft !== null && (
              <StyledHtmlEditor
                key={editorKey}
                ref={editorRef}
                initialHtml={draft.html}
                onChange={(html) => setDraft((current) => (current ? { ...current, html } : current))}
              />
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none">
            <Button variant="outline" onClick={() => setDraft(null)}>
              {t['common.cancel']}
            </Button>
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={saveMutation.isPending || !draft}
              onClick={() => draft && saveMutation.mutate(draft)}
            >
              {saveMutation.isPending ? t['sequences.saving'] : t['common.save']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingRemoveId !== null} onOpenChange={(open) => !open && setConfirmingRemoveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t['common.confirmDelete']}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">{t['sequences.templateRemoveConfirm']}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingRemoveId(null)}>
              {t['common.cancel']}
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => confirmingRemoveId && removeMutation.mutate(confirmingRemoveId)}
            >
              {t['common.delete']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TemplateRow({
  template,
  onRename,
  onEdit,
  onRemove,
}: {
  template: SequenceTemplate
  onRename: (name: string) => Promise<unknown>
  onEdit: () => void
  onRemove: () => void
}) {
  const t = useTranslations()
  const [name, setName] = useState(template.name)
  const [prevName, setPrevName] = useState(template.name)
  if (template.name !== prevName) {
    setPrevName(template.name)
    setName(template.name)
  }

  async function commit() {
    const next = name.trim()
    if (!next || next === template.name) {
      setName(template.name)
      return
    }
    try {
      await onRename(next)
    } catch {
      setName(template.name)
    }
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <Input
          value={name}
          aria-label={t['sequences.templateName']}
          maxLength={180}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            void commit()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
        />
        {template.file_name && template.file_name !== template.name && (
          <p className="mt-1 truncate text-xs text-slate-400">{template.file_name}</p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        {t['sequences.templateEdit']}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
        title={t['sequences.templateRemove']}
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  )
}

function SubjectWithVariables({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  const t = useTranslations()
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef({ start: 0, end: 0 })

  function remember(input: HTMLInputElement) {
    caretRef.current = {
      start: input.selectionStart ?? input.value.length,
      end: input.selectionEnd ?? input.value.length,
    }
  }

  function insert(variable: string, start = caretRef.current.start, end = caretRef.current.end) {
    const safeStart = Math.max(0, Math.min(start, value.length))
    const safeEnd = Math.max(safeStart, Math.min(end, value.length))
    const next = value.slice(0, safeStart) + variable + value.slice(safeEnd)
    const caret = safeStart + variable.length
    caretRef.current = { start: caret, end: caret }
    onChange(next)
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.setSelectionRange(caret, caret)
      caretRef.current = { start: caret, end: caret }
    })
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value)
          remember(e.target)
        }}
        onFocus={(e) => remember(e.currentTarget)}
        onBlur={(e) => remember(e.currentTarget)}
        onClick={(e) => remember(e.currentTarget)}
        onKeyUp={(e) => remember(e.currentTarget)}
        onSelect={(e) => remember(e.currentTarget)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const variable = e.dataTransfer.getData('text/plain')
          if (!variable?.startsWith('{{')) return
          const index = caretIndexFromPoint(e.currentTarget, e.clientX, e.clientY)
          insert(variable, index, index)
        }}
      />
      <VariableChips onInsert={insert} />
      <p className="text-xs text-slate-400">{t['sequences.variablesHint']}</p>
    </div>
  )
}
