'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Check, Plus, Building2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getMyCompanies, createCompany } from '@/lib/api'
import { useCompanyStore } from '@/stores/companyStore'
import { useTranslations } from '@/hooks/useTranslations'

interface Company {
  id: string
  name: string
}

export function CompanySwitcher() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const { activeCompanyId, activeCompanyName, setActiveCompany } = useCompanyStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: getMyCompanies,
  })

  const validCompanies = companies.filter((c): c is Company => c != null && !!c.name)

  // Set default active company on first load
  useEffect(() => {
    if (!activeCompanyId && validCompanies.length > 0) {
      setActiveCompany(validCompanies[0])
    }
  }, [validCompanies, activeCompanyId, setActiveCompany])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
        setCreating(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const createMutation = useMutation({
    mutationFn: (name: string) => createCompany(name),
    onSuccess: (company: Company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      switchTo(company)
      setCreating(false)
      setNewName('')
      toast.success(t['companies.created'])
    },
    onError: () => toast.error(t['common.error']),
  })

  function switchTo(company: Company) {
    setActiveCompany(company)
    setOpen(false)
    setSearch('')
    // Invalidate all data so it reloads for the new company
    queryClient.clear()
  }

  const filtered = validCompanies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const displayName = activeCompanyName ?? validCompanies[0]?.name ?? '...'

  return (
    <div ref={panelRef} className="relative px-3 py-2">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
      >
        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">{displayName[0]?.toUpperCase()}</span>
        </div>
        <span className="flex-1 text-sm font-medium text-slate-800 truncate">{displayName}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-md">
              <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t['common.search']}
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Company list */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">{t['companies.noResults']}</p>
            ) : (
              filtered.map((company) => {
                const isActive = company.id === activeCompanyId
                return (
                  <button
                    key={company.id}
                    onClick={() => switchTo(company)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <span className={`flex-1 text-sm truncate ${isActive ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                      {company.name}
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Create new company */}
          <div className="border-t border-slate-100 p-2">
            {creating ? (
              <div className="flex items-center gap-2 px-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newName.trim()) createMutation.mutate(newName.trim())
                    if (e.key === 'Escape') { setCreating(false); setNewName('') }
                  }}
                  placeholder={t['companies.namePlaceholder']}
                  className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
                  disabled={!newName.trim() || createMutation.isPending}
                  className="text-xs text-indigo-600 font-medium disabled:opacity-40 px-1"
                >
                  {t['common.save']}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {t['companies.createNew']}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
