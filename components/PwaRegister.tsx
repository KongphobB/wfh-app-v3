'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker immediately
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('PWA ServiceWorker registration failed:', err);
          });
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    // 2. Check if already installed & running in standalone mode
    if (typeof window !== 'undefined') {
      const isRunningStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isRunningStandalone);

      // Check if dismissed before in session
      const dismissed = sessionStorage.getItem('snu_pwa_dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }

      // Check if iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isAppleMobile);

      // 3. Android / Chrome / Edge install prompt listener
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('snu_pwa_dismissed', 'true');
  };

  // If already running in standalone app mode, or dismissed, don't show the banner
  if (isStandalone || isDismissed) {
    return null;
  }

  // Show banner if installable on Android/Desktop or on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Installation Banner */}
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 animate-slide-up">
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-orange-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
              <Smartphone className="w-5 h-5 text-orange-400" />
            </div>
            <div className="truncate">
              <p className="font-bold text-xs truncate text-white">ติดตั้งแอป SNU WFH บนมือถือ</p>
              <p className="text-[11px] text-slate-300 truncate">
                {isIOS ? 'แจ้งเตือนตรงเข้าเครื่อง ถ่ายรูปไว' : 'ติดตั้งลงหน้าจอโฮม แจ้งเตือนตรง'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs cursor-pointer gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'วิธีติดตั้ง' : 'ติดตั้ง'}</span>
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 border border-orange-200 dark:border-orange-800">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">วิธีติดตั้งบน iPhone (iOS)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">เพิ่มลงในหน้าจอโฮมแบบง่ายๆ</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <p>
                  เปิดหน้านี้ใน <strong>Safari</strong> แล้วแตะปุ่ม <strong>แชร์ (Share)</strong> <Share className="w-3.5 h-3.5 inline text-blue-500" /> ที่แถบด้านล่างของจอ
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <p>
                  เลื่อนลงมาแล้วเลือกเมนู <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </div>
                <p>
                  กด <strong>"เพิ่ม" (Add)</strong> ที่มุมขวาบน จะได้ไอคอนแอป <strong>SNU WFH</strong> บนหน้าจอมือถือทันที!
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-10"
            >
              เข้าใจแล้ว
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
