'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            เกิดข้อผิดพลาดในระบบ
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Something went wrong while loading this page
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-left text-xs font-mono text-slate-600 dark:text-slate-300 break-words max-h-32 overflow-y-auto">
          {error.message || 'An unexpected client error occurred.'}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button
            type="button"
            onClick={() => reset()}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ลองใหม่อีกครั้ง</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href = '/dashboard';
            }}
            className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
