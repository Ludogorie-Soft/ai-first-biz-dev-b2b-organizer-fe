import type { TranslationKey } from '@/lib/i18n'

/** Pause details the API returns for each mailbox. */
export interface MailboxPauseInfo {
  is_paused: boolean
  paused_reason: string | null
  paused_at: string | null
  paused_bounce_rate: number | string | null
  paused_bounced_count: number | null
  paused_total_count: number | null
}

/** Hard-bounce rate above which a mailbox is auto-paused (API: HARD_BOUNCE_THRESHOLD). */
export const BOUNCE_PAUSE_THRESHOLD_PERCENT = 5

/** Why the mailbox is paused, as one sentence for the UI. */
export function pauseReasonText(mb: MailboxPauseInfo, t: Record<TranslationKey, string>): string {
  if (mb.paused_reason === 'high_bounce_rate') {
    // Paused before the numbers were recorded
    if (mb.paused_bounce_rate == null || mb.paused_total_count == null) {
      return t['mailboxPause.reasonBounceNoNumbers'].replace('{limit}', String(BOUNCE_PAUSE_THRESHOLD_PERCENT))
    }
    return t['mailboxPause.reasonBounce']
      .replace('{rate}', (Number(mb.paused_bounce_rate) * 100).toFixed(1))
      .replace('{bounced}', String(mb.paused_bounced_count ?? 0))
      .replace('{total}', String(mb.paused_total_count))
      .replace('{limit}', String(BOUNCE_PAUSE_THRESHOLD_PERCENT))
  }
  return t['mailboxPause.reasonUnknown']
}

/** "since <date>" suffix, or empty when the pause time is unknown. */
export function pausedSinceText(mb: MailboxPauseInfo, t: Record<TranslationKey, string>): string {
  if (!mb.paused_at) return ''
  return t['mailboxPause.since'].replace('{date}', new Date(mb.paused_at).toLocaleString())
}
