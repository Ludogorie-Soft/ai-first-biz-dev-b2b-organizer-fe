'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, XCircle, UserPlus } from 'lucide-react'
import { checkInvitation, acceptInvitationRegister, acceptInvitationLogin } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useTranslations } from '@/hooks/useTranslations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { queryClient } from '@/app/providers'
import Link from 'next/link'

const schema = z.object({
  password: z.string().min(8),
})
type FormData = z.infer<typeof schema>

interface InvitationInfo {
  email: string
  company_name: string
  user_exists: boolean
}

function AcceptInviteContent() {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { setAuth } = useAuthStore()

  const [invite, setInvite] = useState<InvitationInfo | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid' | 'accepting'>(() => token ? 'loading' : 'invalid')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!token) return
    checkInvitation(token)
      .then((data: InvitationInfo) => { setInvite(data); setStatus('ready') })
      .catch(() => setStatus('invalid'))
  }, [token])

  async function handleAccept(data: FormData) {
    if (!invite) return
    setStatus('accepting')
    try {
      const fn = invite.user_exists ? acceptInvitationLogin : acceptInvitationRegister
      const result = await fn(token, data.password)
      queryClient.clear()
      setAuth(result.access_token, result.refresh_token, result.user)
      router.push('/campaigns')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t['common.error']
      toast.error(msg)
      setStatus('ready')
    }
  }

  if (status === 'loading') {
    return (
      <div className="text-center">
        <Loader2 className="h-10 w-10 text-indigo-500 mx-auto mb-4 animate-spin" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="text-center">
        <XCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-1">{t['org.inviteExpired']}</h2>
        <p className="text-sm text-slate-500 mb-6">{t['org.inviteInvalid']}</p>
        <Link href="/login">
          <Button variant="outline" className="w-full">{t['auth.signIn']}</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-center mb-4">
        <UserPlus className="h-10 w-10 text-indigo-500" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 text-center mb-1">{t['org.inviteTitle']}</h2>
      <p className="text-sm text-slate-500 text-center mb-6">
        {invite?.user_exists
          ? <>{t['org.inviteExistingUser']} <span className="font-medium text-slate-700">{invite.company_name}</span></>
          : <>{t['org.inviteJoin']} <span className="font-medium text-slate-700">{invite?.company_name}</span></>
        }
      </p>

      <form onSubmit={handleSubmit(handleAccept)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t['auth.email']}</Label>
          <Input value={invite?.email ?? ''} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>{t['auth.password']}</Label>
          <Input
            type="password"
            {...register('password')}
            className={errors.password ? 'border-red-300' : ''}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
          disabled={status === 'accepting'}
        >
          {status === 'accepting' ? t['org.inviteAccepting'] : t['org.inviteAccept']}
        </Button>
      </form>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <Loader2 className="h-10 w-10 text-indigo-500 mx-auto mb-4 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
