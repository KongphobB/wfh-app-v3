'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, MapPin, BellRing, FileText, UserCheck, 
  ShieldCheck, KeyRound, LogOut, User, BookOpen
} from 'lucide-react';
import { SessionPayload } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';

interface AppSidebarProps {
  user: SessionPayload | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

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

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 h-screen bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 text-slate-800 shadow-xs z-20 overflow-hidden">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Sidebar Brand Header */}
        <div className="h-15 px-4.5 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1.5 shadow-2xs shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/snu-logo.png" alt="SNU Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 tracking-tight text-sm leading-tight">
              SNU WFH
            </h2>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">{t.nav.systemTag}</p>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-2.5 mx-3 my-2 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold">
              <User className="w-3.5 h-3.5" />
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
        <nav className="px-3 space-y-0.5 overflow-y-auto flex-1 py-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 mt-1">
            {t.nav.dashboard}
          </p>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                  isActive
                    ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Icon className={cn('w-4 h-4 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-slate-500')} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions (Permanently pinned at bottom) */}
      <div className="p-2.5 border-t border-slate-100 space-y-0.5 shrink-0 bg-white">
        <Link
          href="/change-pin"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium"
        >
          <KeyRound className="w-3.5 h-3.5 text-orange-500" />
          <span>{t.nav.changePin}</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.nav.logout}</span>
        </button>
      </div>
    </aside>
  );
}
