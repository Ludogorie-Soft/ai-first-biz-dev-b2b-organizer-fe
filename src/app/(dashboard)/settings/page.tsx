'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  getCompany, updateCompany,
  getInvitations, sendInvitation, revokeInvitation,
  getCompanyUsers, removeMember,
} from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslations } from '@/hooks/useTranslations'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const companySchema = z.object({
  name: z.string().min(1),
  website: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
})
type CompanyFormData = z.infer<typeof companySchema>

interface OrgUser { id: string; email: string }
interface Invitation { id: string; email: string; expires_at: string }

export default function SettingsPage() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()

  // ─── Company profile ────────────────────────────────────────────────────
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: queryKeys.company.profile,
    queryFn: getCompany,
  })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  })
  useEffect(() => {
    if (company) reset({
      name: company.name || company.company_name || '',
      website: company.website || '',
      industry: company.industry || '',
      description: company.description || '',
    })
  }, [company, reset])
  const updateMutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.company.profile }); toast.success(t['common.success']) },
    onError: () => toast.error(t['common.error']),
  })

  // ─── Members ────────────────────────────────────────────────────────────
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.company.users,
    queryFn: getCompanyUsers,
  })
  const users: OrgUser[] = usersData?.users || usersData || []
  // In simplified org model, everyone is an owner
  const isOwner = true
  const isAdmin = false

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.company.users }); toast.success(t['common.success']) },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t['common.error']),
  })

  // ─── Invitations (owner only) ────────────────────────────────────────────
  const { data: invitationsData } = useQuery({
    queryKey: queryKeys.org.invitations,
    queryFn: getInvitations,
    enabled: isOwner,
  })
  const invitations: Invitation[] = Array.isArray(invitationsData) ? invitationsData : (invitationsData?.invitations ?? [])

  const [inviteEmail, setInviteEmail] = useState('')
  const sendInviteMutation = useMutation({
    mutationFn: () => sendInvitation(inviteEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.invitations })
      setInviteEmail('')
      toast.success(t['common.success'])
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t['common.error']),
  })
  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.org.invitations }); toast.success(t['common.success']) },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t['common.error']),
  })

  return (
    <div>
      <PageHeader title={t['nav.settings']} />

      <div className="max-w-2xl space-y-8">
        {/* Company Profile */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5">{t['settings.companyProfile']}</h2>
            {companyLoading ? (
              <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t['settings.name']}</Label>
                  <Input {...register('name')} className={errors.name ? 'border-red-300' : ''} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t['settings.website']}</Label>
                  <Input type="url" placeholder="https://" {...register('website')} />
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
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? t['settings.saving'] : t['settings.save']}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Invite — owner only */}
        {isOwner && (
          <>
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">{t['settings.inviteTeamMember']}</h2>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t['settings.inviteEmail']}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={sendInviteMutation.isPending || !inviteEmail}
                  onClick={() => sendInviteMutation.mutate()}
                >
                  {sendInviteMutation.isPending ? t['settings.sendingInvite'] : t['settings.sendInvite']}
                </Button>
              </div>

              {/* Pending invitations */}
              {invitations.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">{t['settings.pendingInvitations']}</h3>
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t['common.email']}</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t['settings.expiresAt']}</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="text-sm text-slate-900">{inv.email}</TableCell>
                            <TableCell className="text-sm text-slate-500">
                              {new Date(inv.expires_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                disabled={revokeInviteMutation.isPending}
                                onClick={() => revokeInviteMutation.mutate(inv.id)}
                              >
                                {t['settings.revoke']}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Team Members */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-4">{t['settings.teamMembers']}</h2>
          {usersLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t['common.email']}</TableHead>
                    {isOwner && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-sm text-slate-900">{user.email}</TableCell>
                      {isOwner && (
                        <TableCell>
                          {user.email !== currentUser?.email && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              disabled={removeMemberMutation.isPending}
                              onClick={() => removeMemberMutation.mutate(user.id)}
                            >
                              {t['settings.remove']}
                            </Button>
                          )}
                        </TableCell>
                      )}
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
