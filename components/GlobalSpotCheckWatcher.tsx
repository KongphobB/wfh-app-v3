'use client';

import { useState, useEffect, useRef } from 'react';
import SpotCheckModal from '@/components/SpotCheckModal';
import { SpotCheck } from '@/types';
import { playSpotCheckAlert } from '@/lib/sound';
import { showNativeNotification, subscribeToWebPush } from '@/lib/clientNotification';
import { syncServerTime, getSyncedNow, getThaiDateStr } from '@/lib/timeSync';
import { BellRing, Clock, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function isSpotCheckCurrentlyActive(s: SpotCheck): boolean {
  const isPending = s.result_status === 'Scheduled' || s.result_status === 'Pending' || s.result_status === 'รอการยืนยัน';
  if (!isPending) return false;

  const todayStr = getThaiDateStr(getSyncedNow());
  if (s.check_date !== todayStr) return false;

  let triggerTimeMs = 0;
  if (s.created_at) {
    triggerTimeMs = new Date(s.created_at).getTime();
  }
  if (!triggerTimeMs || isNaN(triggerTimeMs)) {
    triggerTimeMs = new Date(`${s.check_date}T${s.scheduled_time}+07:00`).getTime();
  }

  const nowMs = getSyncedNow();
  // ยังไม่ถึงเวลาสุ่มตรวจ -> ห้ามเด้ง popup
  if (nowMs < triggerTimeMs) {
    return false;
  }

  // เกินเวลา 10 นาทีไปแล้ว -> หมดเวลา
  const deadlineMs = triggerTimeMs + 10 * 60 * 1000;
  if (nowMs > deadlineMs) {
    return false;
  }

  return true;
}

export default function GlobalSpotCheckWatcher() {
  const [activeCheck, setActiveCheck] = useState<SpotCheck | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToastDismissed, setIsToastDismissed] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('10:00');
  const [remainingSecs, setRemainingSecs] = useState(600);

  const playedAlertForId = useRef<string | null>(null);

  // Flashing tab title to catch user's attention when in other tabs
  useEffect(() => {
    if (!activeCheck) {
      if (typeof document !== 'undefined' && document.title.includes('🔔')) {
        document.title = 'SNU WFH — ระบบบันทึกเวลาปฏิบัติงานนอกสถานที่';
      }
      return;
    }

    const interval = setInterval(() => {
      if (typeof document !== 'undefined') {
        document.title = document.title.includes('🔔')
          ? '⚠️ กรุณายืนยันตัวตนด่วน! (Spot Check)'
          : '🔔 สุ่มตรวจ! SNU WFH';
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.title = 'SNU WFH — ระบบบันทึกเวลาปฏิบัติงานนอกสถานที่';
      }
    };
  }, [activeCheck]);

  const checkPendingSpotCheck = async () => {
    try {
      const res = await fetch('/api/spotcheck');
      if (!res.ok) return;

      const data = await res.json();
      if (data.server_timestamp) {
        syncServerTime(data.server_timestamp);
      }

      const list: SpotCheck[] = data.spotChecks || [];
      const pending = list.find((s) => isSpotCheckCurrentlyActive(s));

      if (pending) {
        setActiveCheck(pending);

        // First time detecting this spot check -> play sound and spawn notification
        if (playedAlertForId.current !== pending.id) {
          playedAlertForId.current = pending.id;
          setIsToastDismissed(false);
          setIsModalOpen(true); // Open modal by default on first trigger
          playSpotCheckAlert(); // Play crisp "ปิ๊ง! 🔔" chime

          // Show Native Mobile & Desktop Notification via ServiceWorker / Notification API
          showNativeNotification({
            title: '🔔 คำสั่งสุ่มตรวจยืนยันตัวตนเฉพาะกิจ (Spot Check)',
            body: `รอบ ${pending.round} — กรุณาเปิดกล้องถ่ายภาพ Selfie สดยืนยันตัวตนภายใน 10 นาที`,
            url: '/spotcheck',
            tag: pending.id,
            sound: 'spotcheck',
            vibrate: [300, 150, 300, 150, 400],
            requireInteraction: true,
          }).catch(() => {});
        }
      } else if (!pending && activeCheck) {
        setActiveCheck(null);
        setIsModalOpen(false);
      }
    } catch {
      // Ignore background fetch error
    }
  };

  // Smart visibility-aware polling & Web Push subscription setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        subscribeToWebPush().catch(() => {});
      } else if (Notification.permission === 'default') {
        Notification.requestPermission()
          .then((perm) => {
            if (perm === 'granted') {
              subscribeToWebPush().catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    checkPendingSpotCheck();

    const interval = setInterval(() => {
      // Avoid burning quotas and network if tab is minimized or hidden
      if (typeof document !== 'undefined' && document.hidden) return;
      checkPendingSpotCheck();
    }, 25000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkPendingSpotCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const triggeredMilestonesRef = useRef<Set<number>>(new Set());

  // Countdown timer calculation for the active spot check
  // and reliable periodic reminder chimes (8m, 6m, 4m, 2m, 1m, 30s)
  useEffect(() => {
    if (!activeCheck) {
      triggeredMilestonesRef.current.clear();
      return;
    }

    // Reset milestones when checking a new spot check ID
    if (playedAlertForId.current !== activeCheck.id) {
      triggeredMilestonesRef.current.clear();
    }

    const calcTimer = () => {
      let spotTime = 0;
      if (activeCheck.created_at) {
        spotTime = new Date(activeCheck.created_at).getTime();
      }
      if (!spotTime || isNaN(spotTime)) {
        const today = getThaiDateStr(getSyncedNow());
        spotTime = new Date(`${today}T${activeCheck.scheduled_time}+07:00`).getTime();
      }
      if (!spotTime || isNaN(spotTime)) {
        spotTime = getSyncedNow();
      }

      const deadline = spotTime + 10 * 60 * 1000;
      const diffMs = deadline - getSyncedNow();
      const secs = Math.max(0, Math.floor(diffMs / 1000));

      setRemainingSecs(secs);

      if (secs <= 0) {
        setTimeLeftStr('00:00');
        setActiveCheck(null);
        setIsModalOpen(false);
      } else {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        setTimeLeftStr(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);

        // Milestone reminder chimes: 8m, 6m, 4m, 2m, 1m, and 30s
        // Works reliably even when tab is throttled in background or modal is open
        const MILESTONES = [480, 360, 240, 120, 60, 30];
        for (const milestone of MILESTONES) {
          if (secs <= milestone && !triggeredMilestonesRef.current.has(milestone)) {
            triggeredMilestonesRef.current.add(milestone);
            playSpotCheckAlert();
            break;
          }
        }
      }
    };

    calcTimer();
    const timerInterval = setInterval(calcTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [activeCheck]);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setActiveCheck(null);
    checkPendingSpotCheck();
  };

  if (!activeCheck) return null;

  return (
    <>
      {/* 1. Full Camera Spot Check Modal */}
      {isModalOpen && (
        <SpotCheckModal
          spotCheck={activeCheck}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      )}

      {/* 2. Top Floating Attention Toast Popup (Visible whenever spot check is active) */}
      {!isModalOpen && (
        <div className="fixed top-3 left-3 right-3 sm:left-auto sm:top-5 sm:right-5 z-40 max-w-md w-auto sm:w-full animate-in fade-in slide-in-from-top-4 duration-300 drop-shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950 border-2 border-rose-500/80 rounded-3xl p-4.5 shadow-2xl text-white backdrop-blur-xl relative overflow-hidden">
            {/* Top pulsing glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 animate-pulse" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shrink-0 animate-bounce">
                  <BellRing className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white tracking-tight">
                      🔔 คำสั่งสุ่มตรวจยืนยันตัวตน!
                    </h4>
                    <Badge variant="destructive" className="text-[10px] px-2 py-0 animate-pulse font-bold">
                      ด่วน
                    </Badge>
                  </div>
                  <p className="text-xs text-rose-200/90 font-medium mt-0.5">
                    รอบ {activeCheck.round} — กรุณาถ่ายภาพ Selfie สด
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsToastDismissed(true)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                title="ย่อแถบแจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Countdown timer banner */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <Clock className="w-4 h-4 text-amber-400 animate-spin-slow" />
                <span className="text-slate-300">เหลือเวลา:</span>
                <span className="text-amber-400 font-black text-sm bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                  {timeLeftStr} น.
                </span>
              </div>

              <Button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs gap-1.5 shadow-lg shadow-rose-500/30 hover:scale-105 transition-all py-2 px-3.5 rounded-xl"
              >
                <Camera className="w-4 h-4" />
                <span>เปิดกล้องสแกน ↗</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
