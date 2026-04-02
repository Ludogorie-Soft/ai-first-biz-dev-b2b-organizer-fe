'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { register as registerApi } from '@/lib/api'
import { useTranslations } from '@/hooks/useTranslations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  company_name: z.string().min(2),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const t = useTranslations()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: ({ email, password, company_name }: FormData) =>
      registerApi(email, password, company_name),
    onSuccess: (_data, variables) => {
      router.push(`/verify-email?email=${encodeURIComponent(variables.email)}`)
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
      <h2 className="text-xl font-semibold text-slate-900 mb-1">{t['auth.registerTitle']}</h2>
      <p className="text-sm text-slate-500 mb-6">{t['auth.registerSubtitle']}</p>

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
          <Label htmlFor="company_name">{t['auth.companyName']}</Label>
          <Input
            id="company_name"
            type="text"
            {...register('company_name')}
            className={errors.company_name ? 'border-red-300' : ''}
          />
          {errors.company_name && (
            <p className="text-xs text-red-500">{errors.company_name.message}</p>
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
          {mutation.isPending ? t['auth.registering'] : t['auth.createAccount']}
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        {t['auth.hasAccount']}{' '}
        <Link href="/login" className="text-indigo-600 hover:underline font-medium">
          {t['auth.signInLink']}
        </Link>
      </p>
    </div>
  )
}
