'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { useSetupStatus } from '@/hooks/useSetupStatus'
import { useTranslations } from '@/hooks/useTranslations'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { TranslationKey } from '@/lib/i18n/bg'

const steps = [
  {
    key: 'mailbox',
    labelKey: 'setup.step.mailbox' as TranslationKey,
    descKey: 'setup.step.mailboxDesc' as TranslationKey,
    href: '/mailboxes',
  },
  {
    key: 'sequence',
    labelKey: 'setup.step.sequence' as TranslationKey,
    descKey: 'setup.step.sequenceDesc' as TranslationKey,
    href: '/sequences/new',
  },
  {
    key: 'targetGroup',
    labelKey: 'setup.step.targetGroup' as TranslationKey,
    descKey: 'setup.step.targetGroupDesc' as TranslationKey,
    href: '/target-groups/new',
  },
] as const

export default function SetupPage() {
  const t = useTranslations()
  const router = useRouter()
  const { isLoading, isComplete, completion } = useSetupStatus()

  useEffect(() => {
    if (!isLoading && isComplete) {
      router.replace('/campaigns')
    }
  }, [isLoading, isComplete, router])

  const handleAddNow = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t['setup.title']} description={t['setup.description']} />
        <div className="space-y-3 max-w-2xl">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div>
        <PageHeader title={t['setup.title']} description={t['setup.allDone']} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t['setup.title']} description={t['setup.description']} />
      <div className="space-y-3 max-w-2xl">
        {steps.map((step) => {
          const isStepComplete = completion[step.key]
          return (
            <Card key={step.key}>
              <CardContent className="flex items-start justify-between gap-4 py-5">
                <div className="flex items-start gap-3 min-w-0">
                  {isStepComplete ? (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                  ) : (
                    <Circle className="mt-0.5 h-6 w-6 shrink-0 text-slate-300" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-base font-medium ${isStepComplete ? 'text-slate-900' : 'text-slate-800'}`}>
                      {t[step.labelKey]}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t[step.descKey]}
                    </p>
                  </div>
                </div>
                {!isStepComplete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleAddNow(step.href)}
                  >
                    {t['setup.addNow']}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
