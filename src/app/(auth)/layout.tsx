export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-semibold text-slate-900 tracking-tight">
            Launch<span className="text-indigo-600">Ops</span>
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
