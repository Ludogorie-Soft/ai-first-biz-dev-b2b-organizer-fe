'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Lang = 'bg' | 'en'

interface LangState {
  lang: Lang
  toggleLang: () => void
  setLang: (lang: Lang) => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'bg',
      toggleLang: () => set((state) => ({ lang: state.lang === 'bg' ? 'en' : 'bg' })),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'lang-storage',
    }
  )
)
