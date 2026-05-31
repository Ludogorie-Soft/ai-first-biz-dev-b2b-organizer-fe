'use client'

import { useQuery } from '@tanstack/react-query'
import { getMailboxes, getSequences, getTargetGroups } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useCompanyStore } from '@/stores/companyStore'

export function useSetupStatus() {
  const activeCompanyId = useCompanyStore((s) => s.activeCompanyId)

  const { data: mailboxesData, isLoading: mailboxesLoading } = useQuery({
    queryKey: [...queryKeys.mailboxes.all, activeCompanyId],
    queryFn: getMailboxes,
    enabled: !!activeCompanyId,
  })

  const { data: sequencesData, isLoading: sequencesLoading } = useQuery({
    queryKey: [...queryKeys.sequences.all, activeCompanyId],
    queryFn: getSequences,
    enabled: !!activeCompanyId,
  })

  const { data: targetGroupsData, isLoading: targetGroupsLoading } = useQuery({
    queryKey: [...queryKeys.targetGroups.all, activeCompanyId],
    queryFn: getTargetGroups,
    enabled: !!activeCompanyId,
  })

  const isLoading = !activeCompanyId || mailboxesLoading || sequencesLoading || targetGroupsLoading

  const mailboxes = mailboxesData?.mailboxes || mailboxesData || []
  const sequences = sequencesData?.sequences || sequencesData || []
  const targetGroups = targetGroupsData?.target_groups || targetGroupsData || []

  const completion = {
    mailbox: mailboxes.length > 0,
    sequence: sequences.length > 0,
    targetGroup: targetGroups.length > 0,
  }

  const isComplete = completion.mailbox && completion.sequence && completion.targetGroup

  return { isLoading, isComplete, completion }
}
