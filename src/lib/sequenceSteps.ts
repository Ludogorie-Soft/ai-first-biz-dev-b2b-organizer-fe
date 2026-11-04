import type { TranslationKey } from '@/lib/i18n'

/** Message for the API's 400 when a campaign's sequence has no steps, otherwise null. */
export function emptySequenceErrorMessage(
  err: unknown,
  t: Record<TranslationKey, string>,
): string | null {
  const data = (err as { response?: { data?: { code?: string; sequences?: string[] } } })?.response?.data
  if (data?.code !== 'SEQUENCE_HAS_NO_STEPS') return null
  return t['campaigns.emptySequencesBlocked'].replace('{sequences}', (data.sequences ?? []).join(', '))
}
