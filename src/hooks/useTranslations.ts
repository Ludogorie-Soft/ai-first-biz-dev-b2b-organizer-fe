'use client'

import { useLangStore } from '@/stores/langStore'
import { bg } from '@/lib/i18n/bg'
import { en } from '@/lib/i18n/en'
import type { TranslationKey } from '@/lib/i18n/bg'

type Translations = typeof bg

export function useTranslations(): Translations {
  const lang = useLangStore((s) => s.lang)
  return lang === 'bg' ? bg : (en as unknown as Translations)
}

export type { TranslationKey }
