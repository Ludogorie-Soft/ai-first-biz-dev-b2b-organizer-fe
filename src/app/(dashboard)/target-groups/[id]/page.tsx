'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useRef } from 'react'
import { getLeads, previewLeads, importLeads } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
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
import { Label } from '@/components/ui/label'
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

interface Lead {
  id: string
  email: string
  first_name?: string
  last_name?: string
  status: 'active' | 'replied' | 'bounced' | 'unsubscribed' | 'opted_out'
  notes?: string
}

const PAGE_SIZE = 20

export default function TargetGroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewColumns, setPreviewColumns] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [previewLoading, setPreviewLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leads.all({ target_group_id: id, page, limit: PAGE_SIZE }),
    queryFn: () => getLeads({ target_group_id: id, page, limit: PAGE_SIZE }),
  })

  const leads: Lead[] = data?.leads || data?.data || data || []
  const total = data?.total || data?.count || leads.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const importMutation = useMutation({
    mutationFn: () => importLeads(selectedFile!, id, columnMap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all({ target_group_id: id }) })
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

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/target-groups"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t['targetGroups.backToGroups']}
        </Link>
      </div>

      <PageHeader
        title={t['targetGroups.title']}
        action={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t['targetGroups.importLeads']}
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          title={t['targetGroups.noLeads']}
          description={t['targetGroups.noLeadsDesc']}
          action={
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t['targetGroups.importLeads']}
            </Button>
          }
        />
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
                    {t['common.firstName']}
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {t['common.lastName']}
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {t['common.status']}
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {t['common.notes']}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-slate-900 text-sm">{lead.email}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{lead.first_name ?? '—'}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{lead.last_name ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} label={leadStatusLabel(lead.status)} />
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm max-w-xs truncate">
                      {lead.notes ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
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

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t['targetGroups.importLeads']}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Upload */}
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
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Column mapping */}
            {previewLoading && (
              <p className="text-sm text-slate-500">{t['common.loading']}</p>
            )}
            {previewColumns.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-700">{t['targetGroups.mapColumns']}</h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t['targetGroups.emailColumn']} *</Label>
                    <Select onValueChange={(v: string | null) => { if (v) setColumnMap((m) => ({ ...m, email: v })) }}>
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
                  <div className="space-y-1">
                    <Label className="text-xs">{t['targetGroups.firstNameColumn']}</Label>
                    <Select onValueChange={(v: string | null) => { if (v) setColumnMap((m) => ({ ...m, first_name: v })) }}>
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
                  <div className="space-y-1">
                    <Label className="text-xs">{t['targetGroups.lastNameColumn']}</Label>
                    <Select onValueChange={(v: string | null) => { if (v) setColumnMap((m) => ({ ...m, last_name: v })) }}>
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
