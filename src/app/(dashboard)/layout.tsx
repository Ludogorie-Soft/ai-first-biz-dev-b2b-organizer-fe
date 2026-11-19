import { Sidebar } from '@/components/layout/Sidebar'
import { SetupGuard } from '@/components/layout/SetupGuard'
import { PausedMailboxBanner } from '@/components/layout/PausedMailboxBanner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <main className="flex-1 px-8 py-8">
          <PausedMailboxBanner />
          <SetupGuard>{children}</SetupGuard>
        </main>
      </div>
    </div>
  )
}
