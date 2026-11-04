import type { TranslationKey } from '@/lib/i18n'

/** Message for the API's 409 when a mailbox must complete a warm-up campaign first, otherwise null. */
export function friendlyWarmupErrorMessage(
  err: unknown,
  t: Record<TranslationKey, string>,
): string | null {
  const data = (err as { response?: { data?: { code?: string; mailboxes?: string[] } } })?.response?.data
  if (data?.code !== 'FRIENDLY_WARMUP_PENDING') return null
  return t['campaigns.friendlyWarmupBlocked'].replace('{mailboxes}', (data.mailboxes ?? []).join(', '))
}
