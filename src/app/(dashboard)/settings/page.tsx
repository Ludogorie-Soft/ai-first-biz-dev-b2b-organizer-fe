'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { getCompany, updateCompany, getCompanyUsers } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const companySchema = z.object({
  name: z.string().min(1),
  website: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

interface CompanyUser {
  id: string
  email: string
  role: string
}

export default function SettingsPage() {
  const t = useTranslations()
  const queryClient = useQueryClient()

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: queryKeys.company.profile,
    queryFn: getCompany,
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.company.users,
    queryFn: getCompanyUsers,
  })

  const users: CompanyUser[] = usersData?.users || usersData || []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormData>({ resolver: zodResolver(companySchema) })

  useEffect(() => {
    if (company) {
      reset({
        name: company.name || company.company_name || '',
        website: company.website || '',
        industry: company.industry || '',
        description: company.description || '',
      })
    }
  }, [company, reset])

  const updateMutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.profile })
      toast.success(t['common.success'])
    },
    onError: () => toast.error(t['common.error']),
  })

  return (
    <div>
      <PageHeader title={t['nav.settings']} />

      <div className="max-w-2xl space-y-8">
        {/* Company Profile */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5">
              {t['settings.companyProfile']}
            </h2>

            {companyLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t['settings.name']}</Label>
                  <Input
                    {...register('name')}
                    className={errors.name ? 'border-red-300' : ''}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t['settings.website']}</Label>
                  <Input
                    type="url"
                    placeholder="https://"
                    {...register('website')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t['settings.industry']}</Label>
                  <Input {...register('industry')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t['settings.description']}</Label>
                  <Textarea rows={3} {...register('description')} />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? t['settings.saving'] : t['settings.save']}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Team Members */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            {t['settings.teamMembers']}
          </h2>

          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['common.email']}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t['settings.role']}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-sm text-slate-900">{user.email}</TableCell>
                      <TableCell className="text-sm text-slate-500 capitalize">{user.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
