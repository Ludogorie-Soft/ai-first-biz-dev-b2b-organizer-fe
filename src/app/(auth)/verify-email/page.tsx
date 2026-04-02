'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { verifyEmail } from '@/lib/api'
import { useTranslations } from '@/hooks/useTranslations'
import { Button } from '@/components/ui/button'

function VerifyEmailContent() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) return
    setStatus('loading')
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err: { response?: { data?: { error?: string } } }) => {
        setErrorMsg(err?.response?.data?.error ?? t['auth.verificationFailed'])
        setStatus('error')
      })
  }, [token])

  if (token) {
    return (
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 text-indigo-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-slate-900">{t['auth.verifying']}</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-1">{t['auth.emailVerified']}</h2>
            <p className="text-sm text-slate-500 mb-6">{t['auth.accountActive']}</p>
            <Link href="/login">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
                {t['auth.signIn']}
              </Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-1">{t['auth.verificationFailed']}</h2>
            <p className="text-sm text-slate-500 mb-6">{errorMsg}</p>
            <Link href="/register">
              <Button variant="outline" className="w-full">{t['auth.backToRegister']}</Button>
            </Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="text-center">
      <Mail className="h-10 w-10 text-indigo-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-slate-900 mb-1">{t['auth.checkInbox']}</h2>
      <p className="text-sm text-slate-500 mb-2">
        {t['auth.verificationSentTo']}{' '}
        {email ? <span className="font-medium text-slate-700">{email}</span> : null}.
      </p>
      <p className="text-sm text-slate-400">{t['auth.linkExpires']}</p>
      <p className="text-sm text-slate-500 text-center mt-8">
        {t['auth.alreadyVerified']}{' '}
        <Link href="/login" className="text-indigo-600 hover:underline font-medium">
          {t['auth.signInLink']}
        </Link>
      </p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <Loader2 className="h-10 w-10 text-indigo-500 mx-auto mb-4 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
