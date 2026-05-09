'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pause, Play, Trash2, Upload, ChevronLeft, ChevronRight, RotateCcw, Download, ListOrdered } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'
import { getCampaign, getCampaignStats, updateCampaign, deleteCampaign, getLeads, previewLeads, importLeads, updateLead, downloadLeadsTemplate } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'draft' | 'pending_mailbox_approval'
  campaign_sequences?: { sequence_id: string }[]
}

interface CampaignStats {
  sent: number
  pending: number
  replied: number
  failed: number
  reply_breakdown: {
    positive: number
    negative: number
    neutral: number
    out_of_office: number
  }
  steps_total: number
  steps_executed: number
  campaign_status: Campaign['status']
}

interface Lead {
  id: string
  email: string
  office_email?: string | null
  first_name?: string
  last_name?: string
  company_name?: string
  position?: string
  status: 'active' | 'replied' | 'bounced' | 'unsubscribed' | 'opted_out'
  notes?: string
}

const PAGE_SIZE = 20

// Column names used in the downloadable template
const TEMPLATE_COLUMN_MAP: Record<string, string> = {
  email: 'Email',
  office_email: 'Office Email',
  first_name: 'First Name',
  last_name: 'Last Name',
  company_name: 'Company',
  position: 'Job Title',
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewColumns, setPreviewColumns] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [previewLoading, setPreviewLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Leads pagination
  const [page, setPage] = useState(1)

  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: queryKeys.campaigns.single(id),
    queryFn: () => getCampaign(id),
  })

  const { data: stats, isLoading: statsLoading } = useQuery<CampaignStats>({
    queryKey: queryKeys.campaigns.stats(id),
    queryFn: () => getCampaignStats(id),
  })

  useEffect(() => {
    if (!stats?.campaign_status || !campaign) return
    if (stats.campaign_status !== campaign.status) {
      queryClient.setQueryData<Campaign>(queryKeys.campaigns.single(id), (prev) =>
        prev ? { ...prev, status: stats.campaign_status } : prev
      )
    }
  }, [stats?.campaign_status, campaign?.status, id, queryClient])

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: queryKeys.leads.all({ campaign_id: id, page, limit: PAGE_SIZE }),
    queryFn: () => getLeads({ campaign_id: id, page, limit: PAGE_SIZE }),
  })

  const leads: Lead[] = leadsData?.data || leadsData?.leads || leadsData || []
  const total = leadsData?.total ?? leads.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const updateMutation = useMutation({
    mutationFn: (status: string) => updateCampaign(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.single(id) })
      toast.success(t['common.success'])
    },
    onError: () => toast.error(t['common.error']),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all })
      toast.success(t['common.success'])
      router.push('/campaigns')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? t['common.error'])
    },
  })

  const resetLeadMutation = useMutation({
    mutationFn: (leadId: string) => updateLead(leadId, { status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all({ campaign_id: id }) })
      toast.success(t['common.success'])
    },
    onError: () => toast.error(t['common.error']),
  })

  const importMutation = useMutation({
    mutationFn: () => importLeads(selectedFile!, id, columnMap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all({ campaign_id: id }) })
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.stats(id) })
      toast.success(t['common.success'])
      setImportOpen(false)
      setSelectedFile(null)
      setPreviewColumns([])
      setColumnMap({})
    },
    onError: () => toast.error(t['common.error']),
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewLoading(true)
    try {
      const preview = await previewLeads(file)
      const cols: string[] = preview.columns || preview.headers || []
      setPreviewColumns(cols)
    } catch {
      toast.error(t['common.error'])
    } finally {
      setPreviewLoading(false)
    }
  }

  function applyTemplateMapping() {
    const mapped: Record<string, string> = {}
    for (const [field, templateCol] of Object.entries(TEMPLATE_COLUMN_MAP)) {
      if (previewColumns.includes(templateCol)) {
        mapped[field] = templateCol
      }
    }
    setColumnMap(mapped)
  }

  const statusLabel = (status: Campaign['status']) => {
    const map: Record<Campaign['status'], string> = {
      active: t['campaigns.active'],
      paused: t['campaigns.paused'],
      completed: t['campaigns.completed'],
      draft: t['campaigns.draft'],
      pending_mailbox_approval: t['campaigns.pendingMailboxApproval'],
    }
    return map[status] ?? status
  }

  const leadStatusLabel = (status: Lead['status']) => {
    const map: Record<Lead['status'], string> = {
      active: t['campaigns.active'],
      replied: t['campaigns.replied'],
      bounced: 'Bounced',
      unsubscribed: 'Unsubscribed',
      opted_out: 'Opted Out',
    }
    return map[status] ?? status
  }

  if (campaignLoading) return <PageLoader />

  const badgeStatus: Campaign['status'] =
    stats?.campaign_status ?? campaign?.status ?? 'draft'

  const replyBreakdown = [
    { label: t['campaigns.positive'], value: stats?.reply_breakdown?.positive ?? 0 },
    { label: t['campaigns.negative'], value: stats?.reply_breakdown?.negative ?? 0 },
    { label: t['campaigns.neutral'], value: stats?.reply_breakdown?.neutral ?? 0 },
    { label: t['campaigns.outOfOffice'], value: stats?.reply_breakdown?.out_of_office ?? 0 },
  ]

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

      <PageHeader
        title={campaign?.name ?? ''}
        action={
          <div className="flex items-center gap-3">
            {campaign && (
              <StatusBadge status={badgeStatus} label={statusLabel(badgeStatus)} />
            )}
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t['targetGroups.importLeads']}
            </Button>
            {campaign?.campaign_sequences?.[0]?.sequence_id && (
              <Link
                href={`/sequences/${campaign.campaign_sequences[0].sequence_id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ListOrdered className="h-4 w-4 mr-2" />
                {t['campaigns.sequence']}
              </Link>
            )}
            {campaign?.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateMutation.mutate('paused')}
                disabled={updateMutation.isPending}
              >
                <Pause className="h-4 w-4 mr-2" />
                {t['campaigns.pause']}
              </Button>
            )}
            {campaign?.status === 'paused' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate('active')}
                  disabled={updateMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {t['campaigns.resume']}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t['common.delete']}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))
        ) : (
          <>
            {[
              { label: t['campaigns.sent'], value: stats?.sent ?? 0 },
              { label: t['campaigns.pending'], value: stats?.pending ?? 0 },
              { label: t['campaigns.replied'], value: stats?.replied ?? 0 },
              { label: t['campaigns.failed'], value: stats?.failed ?? 0 },
            ].map(({ label, value }) => (
              <Card key={label} className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-500 mb-1">{label}</p>
                  <p className="text-3xl font-semibold text-slate-900">{value}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500 mb-1">{t['campaigns.sequenceProgress']}</p>
                <p className="text-3xl font-semibold text-slate-900 tabular-nums">
                  {stats?.steps_executed ?? 0} / {stats?.steps_total ?? 0}
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-snug">
                  {t['campaigns.stepsExecutedDetail']
                    .replace('{executed}', String(stats?.steps_executed ?? 0))
                    .replace('{total}', String(stats?.steps_total ?? 0))}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Leads table */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">{t['targetGroups.leads']}</h2>
        {leadsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-400">{t['targetGroups.noLeads']}</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.email']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.officeEmail']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.firstName']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.lastName']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.company']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.jobTitle']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.status']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.notes']}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium text-slate-900 text-sm">{lead.email}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{lead.office_email ?? '—'}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{lead.first_name ?? '—'}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{lead.last_name ?? '—'}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{lead.company_name ?? '—'}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{lead.position ?? '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} label={leadStatusLabel(lead.status)} />
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm max-w-xs truncate">
                        {lead.notes ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {lead.status !== 'active' && lead.status !== 'unsubscribed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-slate-400 hover:text-indigo-600"
                            onClick={() => resetLeadMutation.mutate(lead.id)}
                            disabled={resetLeadMutation.isPending}
                            title="Reset to active"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Reset
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                {t['common.page']} {page} {t['common.of']} {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t['common.prev']}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {t['common.next']}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reply breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden max-w-md">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">{t['campaigns.replyBreakdown']}</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs font-medium text-slate-500 uppercase">
                {t['campaigns.replyType']}
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase text-right">
                {t['campaigns.count']}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {replyBreakdown.map(({ label, value }) => (
              <TableRow key={label}>
                <TableCell className="text-sm text-slate-700">{label}</TableCell>
                <TableCell className="text-sm font-medium text-slate-900 text-right">{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t['common.confirmDelete']}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">{t['common.confirmDeleteDesc']}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t['common.cancel']}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {t['common.delete']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t['targetGroups.importLeads']}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs text-slate-500 hover:text-indigo-600"
                onClick={() => downloadLeadsTemplate().catch(() => toast.error(t['common.error']))}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {t['targetGroups.downloadTemplate']}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t['targetGroups.selectFile']}</Label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                {selectedFile ? (
                  <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                ) : (
                  <p className="text-sm text-slate-400">{t['targetGroups.selectFile']} (XLSX)</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {previewLoading && (
              <p className="text-sm text-slate-500">{t['common.loading']}</p>
            )}
            {previewColumns.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-700">{t['targetGroups.mapColumns']}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 active:scale-95 transition-all"
                    onClick={applyTemplateMapping}
                  >
                    {t['targetGroups.useTemplate']}
                  </Button>
                </div>
                <div className="space-y-2">
                  {[
                    { field: 'email', label: `${t['targetGroups.emailColumn']} *` },
                    { field: 'office_email', label: t['targetGroups.officeEmailColumn'] },
                    { field: 'first_name', label: t['targetGroups.firstNameColumn'] },
                    { field: 'last_name', label: t['targetGroups.lastNameColumn'] },
                    { field: 'company_name', label: t['targetGroups.companyColumn'] },
                    { field: 'position', label: t['targetGroups.positionColumn'] },
                  ].map(({ field, label }) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Select
                        value={columnMap[field] ?? ''}
                        onValueChange={(v: string | null) => { if (v) setColumnMap((m) => ({ ...m, [field]: v })) }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t['common.select']} />
                        </SelectTrigger>
                        <SelectContent>
                          {previewColumns.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              {t['common.cancel']}
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => importMutation.mutate()}
              disabled={!selectedFile || !columnMap.email || importMutation.isPending}
            >
              {importMutation.isPending ? t['targetGroups.importing'] : t['targetGroups.import']}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
