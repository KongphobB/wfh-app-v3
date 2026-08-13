import { getSession } from '@/lib/auth';
import { AppSidebar } from '@/components/app-sidebar';
import NotificationBell from '@/components/NotificationBell';
import { Toaster } from '@/components/ui/sonner';

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <AppSidebar user={session} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">ระบบงาน:</span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              WFH App v3 (Postgres)
            </span>
          </div>

          {session && (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-700 font-bold">{session.name}</span>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
