'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface Company {
  id: string
  name: string
}

interface CompanyState {
  activeCompanyId: string | null
  activeCompanyName: string | null
  setActiveCompany: (company: Company) => void
  clearActiveCompany: () => void
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      activeCompanyId: null,
      activeCompanyName: null,
      setActiveCompany: (company) =>
        set({ activeCompanyId: company.id, activeCompanyName: company.name }),
      clearActiveCompany: () =>
        set({ activeCompanyId: null, activeCompanyName: null }),
    }),
    {
      name: 'active-company',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
