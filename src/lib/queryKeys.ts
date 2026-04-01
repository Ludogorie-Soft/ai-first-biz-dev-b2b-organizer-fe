export const queryKeys = {
  campaigns: {
    all: ['campaigns'] as const,
    single: (id: string) => ['campaigns', id] as const,
    stats: (id: string) => ['campaigns', id, 'stats'] as const,
  },
  sequences: {
    all: ['sequences'] as const,
    single: (id: string) => ['sequences', id] as const,
  },
  targetGroups: {
    all: ['target-groups'] as const,
    single: (id: string) => ['target-groups', id] as const,
  },
  leads: {
    all: (params?: object) => ['leads', params] as const,
  },
  mailboxes: {
    all: ['mailboxes'] as const,
  },
  company: {
    profile: ['company'] as const,
    users: ['company', 'users'] as const,
  },
}
