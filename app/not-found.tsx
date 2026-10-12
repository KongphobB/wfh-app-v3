import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-inner">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
            Error 404
          </span>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            ไม่พบหน้าที่คุณต้องการ
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Page Not Found — ที่อยู่นี้อาจถูกย้าย ลบ หรือไม่มีอยู่ในระบบ
          </p>
        </div>

        <div className="pt-2">
          <Link href="/dashboard" className="w-full inline-block">
            <Button
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-600/20"
            >
              <Home className="w-4 h-4" />
              <span>กลับสู่หน้าหลัก (Dashboard)</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
