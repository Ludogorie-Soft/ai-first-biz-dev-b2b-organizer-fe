'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileCode2, Pencil, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { deleteSequenceTemplate, updateSequence, uploadSequenceTemplate } from '@/lib/api'
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
import { StyledHtmlEditor, type StyledHtmlEditorHandle } from './StyledHtmlEditor'
import { VariableChips } from './VariableChips'

const ACCEPT_TYPES = '.html,.htm,.eml'
const MAX_FILE_BYTES = 4 * 1024 * 1024

interface UploadResult {
  template_html: string
  warnings?: { removedTrackingPixels: number; removedEmbeddedImages: number }
}

/** The API explains rejected files (type, size), and that reason is what the user needs. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error
  return typeof message === 'string' ? message : fallback
}

export function StyledTemplateCard({
  sequenceId,
  templateHtml,
  fileName,
}: {
  sequenceId: string
  templateHtml: string | null
  fileName: string | null
}) {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<StyledHtmlEditorHandle>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(sequenceId) })

  function openEditor(html: string) {
    setDraft(html)
    setEditorKey((key) => key + 1)
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadSequenceTemplate(sequenceId, file) as Promise<UploadResult>,
    onSuccess: (result) => {
      invalidate()
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
      openEditor(result.template_html)
    },
    onError: (err) => toast.error(apiErrorMessage(err, t['common.error'])),
  })

  const saveMutation = useMutation({
    mutationFn: (html: string) => updateSequence(sequenceId, { template_html: html }),
    onSuccess: () => {
      invalidate()
      toast.success(t['common.success'])
      setDraft(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err, t['common.error'])),
  })

  const removeMutation = useMutation({
    mutationFn: () => deleteSequenceTemplate(sequenceId),
    onSuccess: () => {
      invalidate()
      toast.success(t['common.success'])
      setConfirmingRemove(false)
    },
    onError: (err) => toast.error(apiErrorMessage(err, t['common.error'])),
  })

  function onPickFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t['sequences.templateTooLarge'])
      return
    }
    uploadMutation.mutate(file)
  }

  function insertVariable(variable: string) {
    if (!editorRef.current?.insertVariable(variable)) {
      toast.info(t['sequences.templateClickFirst'])
    }
  }

  return (
    <>
      <Card className="mb-4 max-w-2xl border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileCode2 className="h-5 w-5 flex-shrink-0 text-indigo-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{t['sequences.template']}</p>
                <p className="truncate text-xs text-slate-500">
                  {templateHtml
                    ? fileName || t['sequences.templateUploaded']
                    : t['sequences.templateNone']}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_TYPES}
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              {templateHtml && (
                <Button variant="outline" size="sm" onClick={() => openEditor(templateHtml)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t['sequences.templateEdit']}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={uploadMutation.isPending}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {uploadMutation.isPending
                  ? t['sequences.uploading']
                  : templateHtml
                    ? t['sequences.templateReplace']
                    : t['sequences.templateUpload']}
              </Button>
              {templateHtml && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                  title={t['sequences.templateRemove']}
                  onClick={() => setConfirmingRemove(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {templateHtml ? t['sequences.templateCopyHint'] : t['sequences.templateUploadHint']}
          </p>
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
            <DialogTitle>{t['sequences.templateEditorTitle']}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <p className="text-xs text-slate-500">{t['sequences.templateEditorHint']}</p>
            <VariableChips onInsert={insertVariable} />
            {draft !== null && (
              <StyledHtmlEditor
                key={editorKey}
                ref={editorRef}
                initialHtml={draft}
                onChange={setDraft}
              />
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none">
            <Button variant="outline" onClick={() => setDraft(null)}>
              {t['common.cancel']}
            </Button>
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={saveMutation.isPending}
              onClick={() => draft && saveMutation.mutate(draft)}
            >
              {saveMutation.isPending ? t['sequences.saving'] : t['common.save']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t['common.confirmDelete']}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">{t['sequences.templateRemoveConfirm']}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingRemove(false)}>
              {t['common.cancel']}
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removeMutation.mutate()}
            >
              {t['common.delete']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
