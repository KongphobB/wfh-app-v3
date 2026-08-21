import { getSession } from '@/lib/auth';
import { AppSidebar } from '@/components/app-sidebar';
import MobileNavigation from '@/components/MobileNavigation';
import HeaderActions from '@/components/HeaderActions';
import GlobalSpotCheckWatcher from '@/components/GlobalSpotCheckWatcher';
import { Toaster } from '@/components/ui/sonner';

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen w-full max-w-full flex bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <AppSidebar user={session} />

      {/* Main Content Area (Offset by lg:pl-64 on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full min-h-screen lg:pl-64 overflow-x-hidden">
        <header className="h-16 w-full max-w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          {/* Left: Mobile Navigation Drawer Trigger (Hidden on Desktop) */}
          <div className="flex items-center">
            {session && <MobileNavigation user={session} />}
          </div>

          {/* Right: Actions (Ticket & Notifications) - Always pinned to top right */}
          {session && (
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <HeaderActions />
            </div>
          )}
        </header>

        <main className="flex-1 p-3.5 sm:p-4 pb-24 md:p-6 lg:p-8 lg:pb-8 max-w-7xl w-full mx-auto space-y-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {session && <GlobalSpotCheckWatcher />}
      <Toaster />
    </div>
  );
}
