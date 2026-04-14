'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, MailX } from 'lucide-react'
import { unsubscribe } from '@/lib/api'
import { useTranslations } from '@/hooks/useTranslations'

function UnsubscribeContent() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    unsubscribe(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 text-indigo-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold text-slate-900">{t['unsubscribe.processing']}</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{t['unsubscribe.success']}</h2>
            <p className="text-sm text-slate-500">{t['unsubscribe.successDesc']}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{t['unsubscribe.error']}</h2>
            <p className="text-sm text-slate-500">{t['unsubscribe.errorDesc']}</p>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
          <MailX className="h-4 w-4" />
          <span className="text-xs">BizDev B2B</span>
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
