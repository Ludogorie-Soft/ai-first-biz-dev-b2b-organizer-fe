import { Badge } from '@/components/ui/badge'

type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft' | 'pending_mailbox_approval'
type LeadStatus = 'active' | 'replied' | 'bounced' | 'unsubscribed' | 'opted_out'
type MailboxStatus = 'active' | 'paused'

type StatusType = CampaignStatus | LeadStatus | MailboxStatus

const statusStyles: Record<StatusType, string> = {
  // Campaign
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  draft: 'bg-blue-50 text-blue-700 border-blue-200',
  pending_mailbox_approval: 'bg-orange-50 text-orange-700 border-orange-200',
  // Lead
  replied: 'bg-blue-50 text-blue-700 border-blue-200',
  bounced: 'bg-red-50 text-red-700 border-red-200',
  unsubscribed: 'bg-slate-100 text-slate-600 border-slate-200',
  opted_out: 'bg-orange-50 text-orange-700 border-orange-200',
}

interface StatusBadgeProps {
  status: StatusType
  label: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const styles = statusStyles[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles}`}>
      {label}
    </Badge>
  )
}
