'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, MapPin, BellRing, FileText, UserCheck, 
  ShieldCheck, KeyRound, LogOut, User, Menu, X, ChevronRight, Sparkles, BookOpen
} from 'lucide-react';
import { SessionPayload } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useLanguage } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';

interface MobileNavigationProps {
  user: SessionPayload | null;
}

export default function MobileNavigation({ user }: MobileNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    {
      title: t.nav.dashboard,
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: t.nav.checkin,
      href: '/checkin',
      icon: MapPin,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: t.nav.spotcheck,
      href: '/spotcheck',
      icon: BellRing,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: t.nav.tasks,
      href: '/tasks',
      icon: FileText,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: t.nav.supervisor,
      href: '/supervisor',
      icon: UserCheck,
      roles: ['supervisor', 'admin'],
    },
    {
      title: t.nav.admin,
      href: '/admin',
      icon: ShieldCheck,
      roles: ['admin'],
    },
    {
      title: t.nav.manual,
      href: '/manual',
      icon: BookOpen,
      roles: ['employee', 'supervisor', 'admin'],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  // Quick bottom bar items for mobile
  const bottomBarItems = [
    { title: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { title: t.nav.checkin, href: '/checkin', icon: MapPin },
    { title: t.nav.spotcheck, href: '/spotcheck', icon: BellRing },
    { title: t.nav.tasks, href: '/tasks', icon: FileText },
  ];

  return (
    <>
      {/* 1. Mobile Header Trigger (Hamburger Button) */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs cursor-pointer"
          title="เปิดเมนู"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/snu-logo.png" alt="SNU Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-slate-900 text-sm tracking-tight">SNU WFH</span>
        </div>
      </div>

      {/* 2. Mobile Slide-Over Drawer with Portal */}
      {isDrawerOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-white shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200 h-full">
            <div className="flex flex-col min-h-0 flex-1">
              {/* Drawer Header */}
              <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/snu-logo.png" alt="SNU Logo" className="w-full h-full object-contain rounded-xl" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-sm leading-tight">SNU WFH</h2>
                    <p className="text-[10px] text-slate-500 font-medium">{t.nav.systemTag}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Card */}
              {user && (
                <div className="p-3 mx-3 my-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-500">ID: {user.employee_id}</span>
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'supervisor' ? 'warning' : 'success'} className="text-[9px] px-1.5 py-0">
                        {t.roles[user.role] || user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation List */}
              <nav className="px-3 space-y-1 overflow-y-auto flex-1 py-1">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t.nav.dashboard}
                </p>
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all',
                        isActive
                          ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-500')} />
                        <span>{item.title}</span>
                      </div>
                      <ChevronRight className={cn('w-3.5 h-3.5 opacity-50', isActive ? 'text-white' : 'text-slate-400')} />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 space-y-1 bg-white">
              <Link
                href="/change-pin"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium"
              >
                <KeyRound className="w-4 h-4 text-orange-500" />
                <span>{t.nav.changePin}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.nav.logout}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Mobile Bottom Navigation Bar with Portal */}
      {mounted && createPortal(
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-1 py-1 flex items-center justify-around safe-area-bottom overflow-hidden w-full max-w-full">
          {bottomBarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all min-w-0',
                  isActive
                    ? 'text-orange-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <div className={cn(
                  'p-1 rounded-lg transition-all',
                  isActive ? 'bg-orange-100 text-orange-600' : ''
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] mt-0.5 leading-tight truncate">{item.title}</span>
              </Link>
            );
          })}

          {/* 5th button: Menu Drawer Opener */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer min-w-0',
              isDrawerOpen ? 'text-orange-600 font-bold' : ''
            )}
          >
            <div className="p-1 rounded-lg">
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight truncate">{t.common.actions}</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
