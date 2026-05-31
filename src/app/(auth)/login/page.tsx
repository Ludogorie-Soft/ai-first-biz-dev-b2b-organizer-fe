'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { login } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { queryClient } from '@/app/providers'
import { useTranslations } from '@/hooks/useTranslations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const t = useTranslations()
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: ({ email, password }: FormData) => login(email, password),
    onSuccess: (data) => {
      const token = data.token || data.access_token
      const refreshToken = data.refresh_token || data.refreshToken || ''
      const user = data.user || { id: data.id || '', email: data.email || '' }
      queryClient.clear()
      setAuth(token, refreshToken, user)
      router.push('/setup')
    },
    onError: (err: unknown) => {
      const raw = (err as { response?: { data?: { error?: unknown } } })?.response?.data?.error
      const msg = typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
        ? (raw[0]?.message ?? t['common.error'])
        : t['common.error']
      toast.error(msg)
    },
  })

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-1">{t['auth.loginTitle']}</h2>
      <p className="text-sm text-slate-500 mb-6">{t['auth.loginSubtitle']}</p>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t['auth.email']}</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            {...register('email')}
            className={errors.email ? 'border-red-300' : ''}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">{t['auth.password']}</Label>
          <Input
            id="password"
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
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? t['auth.loggingIn'] : t['auth.signIn']}
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        {t['auth.noAccount']}{' '}
        <Link href="/register" className="text-indigo-600 hover:underline font-medium">
          {t['auth.signUpLink']}
        </Link>
      </p>
    </div>
  )
}
