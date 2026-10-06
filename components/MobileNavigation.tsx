'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, MapPin, BellRing, FileText, UserCheck, 
  ShieldCheck, KeyRound, LogOut, User, Menu, X, ChevronRight, BookOpen, CalendarDays, BarChart3
} from 'lucide-react';
import { SessionPayload } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useLanguage } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';
import SoundToggle from '@/components/SoundToggle';
import ThemeToggle from '@/components/ThemeToggle';
import { testDeviceNotification } from '@/lib/clientNotification';
import { toast } from 'sonner';

interface MobileNavigationProps {
  user: SessionPayload | null;
}

export default function MobileNavigation({ user }: MobileNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang } = useLanguage();
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
      title: t.nav.leave,
      href: '/leave',
      icon: CalendarDays,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: t.nav.analytics,
      href: '/analytics',
      icon: BarChart3,
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

  // Quick bottom bar items for mobile & iPad (role-aware, concise native mobile labels)
  const isSupervisorOrAdmin = user && (user.role === 'supervisor' || user.role === 'admin');
  const bottomBarItems = [
    { title: lang === 'en' ? 'Home' : 'หน้าหลัก', href: '/dashboard', icon: LayoutDashboard },
    { title: lang === 'en' ? 'Clock In' : 'ลงเวลา', href: '/checkin', icon: MapPin },
    { title: lang === 'en' ? 'Spot Check' : 'สุ่มตรวจ', href: '/spotcheck', icon: BellRing },
    isSupervisorOrAdmin
      ? { title: lang === 'en' ? 'Team' : 'ลูกทีม', href: '/supervisor', icon: UserCheck }
      : { title: lang === 'en' ? 'Tasks' : 'ส่งงาน', href: '/tasks', icon: FileText },
  ];

  return (
    <>
      {/* 1. Mobile Header Trigger (Hamburger Button) */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer active:scale-95 transition-all"
          title="เปิดเมนู"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-1 shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/snu-logo.png" alt="SNU Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight">SNU WFH</span>
        </div>
      </div>

      {/* 2. Mobile Slide-Over Drawer with Portal */}
      {isDrawerOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200 h-full border-r border-slate-200 dark:border-slate-800 safe-area-bottom">
            <div className="flex flex-col min-h-0 flex-1">
              {/* Drawer Header */}
              <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center p-1 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/snu-logo.png" alt="SNU Logo" className="w-full h-full object-contain rounded-xl" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight">SNU WFH</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{t.nav.systemTag}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Card */}
              {user && (
                <div className="p-3 mx-3 my-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 font-bold border border-orange-200/50 dark:border-orange-800/50">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{user.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">ID: {user.employee_id}</span>
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'supervisor' ? 'warning' : 'success'} className="text-[9px] px-1.5 py-0">
                        {t.roles[user.role] || user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation List */}
              <nav className="px-3 space-y-1 overflow-y-auto flex-1 py-1">
                <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
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
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400')} />
                        <span>{item.title}</span>
                      </div>
                      <ChevronRight className={cn('w-3.5 h-3.5 opacity-50', isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500')} />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Settings & Quick Preferences */}
            <div className="p-3 mx-3 my-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {lang === 'en' ? 'Settings & Preferences' : 'การตั้งค่าและภาษา'}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {lang === 'en' ? 'Language' : 'ภาษา'}
                </span>
                <LanguageToggle />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {lang === 'en' ? 'Sound Alert' : 'เสียงแจ้งเตือน'}
                </span>
                <SoundToggle />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {lang === 'en' ? 'Dark Mode' : 'ธีมหน้าจอ'}
                </span>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-orange-500" />
                  <span>{lang === 'en' ? 'Notifications' : 'การแจ้งเตือน'}</span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await testDeviceNotification();
                    if (res.success) {
                      toast.success(res.message);
                    } else {
                      toast.warning(res.message);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900 cursor-pointer transition-all active:scale-95"
                >
                  {lang === 'en' ? 'Test Alert' : 'ทดสอบเสียง/สั่น'}
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1 bg-white dark:bg-slate-900">
              <Link
                href="/change-pin"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
              >
                <KeyRound className="w-4 h-4 text-orange-500" />
                <span>{t.nav.changePin}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left font-medium cursor-pointer"
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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-xl px-1.5 py-1.5 flex items-center justify-around safe-area-bottom overflow-hidden w-full max-w-full">
          {bottomBarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all min-w-0 select-none active:scale-95',
                  isActive
                    ? 'text-orange-600 dark:text-orange-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <div className={cn(
                  'p-1 sm:p-1.5 rounded-xl transition-all',
                  isActive ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 shadow-2xs' : ''
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] mt-0.5 font-medium leading-tight truncate">{item.title}</span>
              </Link>
            );
          })}

          {/* 5th button: Menu Drawer Opener */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer min-w-0 select-none active:scale-95',
              isDrawerOpen ? 'text-orange-600 dark:text-orange-400 font-bold' : ''
            )}
          >
            <div className="p-1 sm:p-1.5 rounded-xl">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 font-medium leading-tight truncate">{lang === 'en' ? 'Menu' : 'เมนู'}</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
