'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getSequence, addStep, updateStep, deleteStep } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { VariableEditor, type VariableEditorHandle } from '@/components/sequences/VariableEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{full_name}}', '{{company_name}}', '{{position}}'] as const

interface Step {
  id: string
  subject: string
  body: string
  delay_days: number
  step_order: number
}

interface Sequence {
  id: string
  name: string
  steps: Step[]
}

const stepSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  delay_days: z.number().min(0),
  step_order: z.number().min(1),
})

type StepFormData = z.infer<typeof stepSchema>

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<Step | null>(null)
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.sequences.single(id),
    queryFn: () => getSequence(id),
  })

  const sequence = data || {}
  const steps: Step[] = (data as any)?.sequence_steps ?? []

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
    // Insert into whichever field is currently active, defaulting to body
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
    const nextStepOrder = steps.length === 0 ? 1 : Math.max(...steps.map((s) => s.step_order)) + 1
    reset({ step_order: nextStepOrder, delay_days: steps.length === 0 ? 0 : 1 })
    setDialogOpen(true)
  }

  function openEditDialog(step: Step) {
    setEditingStep(step)
    reset({
      subject: step.subject,
      body: step.body,
      delay_days: step.delay_days,
      step_order: step.step_order,
    })
    setDialogOpen(true)
  }

  const addMutation = useMutation({
    mutationFn: (data: StepFormData) => addStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(id) })
      toast.success(t['common.success'])
      setDialogOpen(false)
    },
    onError: () => toast.error(t['common.error']),
  })

  const updateMutation = useMutation({
    mutationFn: (data: StepFormData) => updateStep(id, editingStep!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences.single(id) })
      toast.success(t['common.success'])
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

  if (isLoading) return <PageLoader />

  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order)

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
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={openAddDialog}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t['sequences.addStep']}
          </Button>
        }
      />

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
          {sortedSteps.map((step) => (
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
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{step.body}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {t['sequences.waitDays']}: {step.delay_days} {t['sequences.days']}
                      </p>
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
          ))}

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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? t['sequences.editStep'] : t['sequences.addStep']}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((formData: StepFormData) => {
              if (editingStep) updateMutation.mutate(formData)
              else addMutation.mutate(formData)
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
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

            {/* Variable chips */}
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
              <Label>{t['sequences.body']}</Label>
              <Controller
                name="body"
                control={control}
                render={({ field }) => (
                  <VariableEditor
                    ref={bodyEditorRef}
                    value={field.value || ''}
                    onChange={field.onChange}
                    hasError={!!errors.body}
                    rows={6}
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t['common.cancel']}
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={addMutation.isPending || updateMutation.isPending}
              >
                {addMutation.isPending || updateMutation.isPending
                  ? t['sequences.saving']
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
