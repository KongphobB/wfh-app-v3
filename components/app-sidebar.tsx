'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, MapPin, BellRing, FileText, UserCheck, 
  ShieldCheck, KeyRound, LogOut, User, Sparkles
} from 'lucide-react';
import { SessionPayload } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AppSidebarProps {
  user: SessionPayload | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    {
      title: 'แผงควบคุม',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: 'ลงเวลาปฏิบัติงาน',
      href: '/checkin',
      icon: MapPin,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: 'สุ่มตรวจยืนยันตัวตน',
      href: '/spotcheck',
      icon: BellRing,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: 'ส่งงานประจำวัน',
      href: '/tasks',
      icon: FileText,
      roles: ['employee', 'supervisor', 'admin'],
    },
    {
      title: 'แผงหัวหน้างาน',
      href: '/supervisor',
      icon: UserCheck,
      roles: ['supervisor', 'admin'],
    },
    {
      title: 'ผู้ดูแลระบบ (Admin)',
      href: '/admin',
      icon: ShieldCheck,
      roles: ['admin'],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen text-slate-800 shadow-sm">
      <div>
        {/* Sidebar Brand Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shadow-sm font-bold">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 tracking-tight text-sm flex items-center gap-1.5">
              <span>WFH App v3</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-mono font-bold">Postgres</span>
            </h2>
            <p className="text-[10px] text-slate-500">ระบบติดตามการทำงานนอกสถานที่</p>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-3.5 mx-3 my-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-slate-500">ID: {user.employee_id}</span>
                <Badge variant={user.role === 'admin' ? 'default' : user.role === 'supervisor' ? 'warning' : 'success'} className="text-[9px] px-1.5 py-0">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="px-3 space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            เมนูการใช้งาน
          </p>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group',
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

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <Link
          href="/change-pin"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <KeyRound className="w-4 h-4 text-orange-500" />
          <span>เปลี่ยนรหัส PIN</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
