'use client';

import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, User, KeyRound } from 'lucide-react';
import { SessionPayload } from '@/types';

export default function Navbar({ user }: { user?: SessionPayload | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">Admin</span>;
      case 'supervisor':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Supervisor</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">Employee</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight flex items-center gap-2 text-base sm:text-lg">
              <span>WFH App v3</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">Postgres</span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">ระบบบันทึกการทำงานนอกสถานที่</p>
          </div>
        </div>

        {/* User Badge & Navigation Actions */}
        {user && (
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2.5 py-1 px-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <User className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">ID: {user.employee_id}</p>
              </div>
              {getRoleBadge(user.role)}
            </div>

            <button
              onClick={() => router.push('/change-pin')}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all text-xs font-medium flex items-center gap-1.5"
              title="เปลี่ยนรหัส PIN"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">เปลี่ยน PIN</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all text-xs font-semibold flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
