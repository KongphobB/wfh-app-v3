'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Clock, MapPin, AlertTriangle, FileText, 
  ChevronRight, ShieldCheck, BellRing, Loader2, ShieldAlert, Sparkles, MessageSquarePlus, Calendar, LogOut,
  Timer, CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CheckinModal from '@/components/CheckinModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { SuggestionModal } from '@/components/SuggestionModal';
import { HolidayCalendarModal } from '@/components/HolidayCalendarModal';
import { CheckinLog, TaskItem, SpotCheck } from '@/types';
import { useLanguage } from '@/lib/i18n';
import { getThaiTime } from '@/lib/timeSync';

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [spotChecks, setSpotChecks] = useState<SpotCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpotCheck, setActiveSpotCheck] = useState<SpotCheck | null>(null);
  const [userRole, setUserRole] = useState<string>('employee');
  const [wfhStatus, setWfhStatus] = useState<string>('เปิดสิทธิ์');
  const [currentEmpId, setCurrentEmpId] = useState<string>('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isHolidayOpen, setIsHolidayOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

  useEffect(() => {
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        const empId = data.employeeId || data.employee_id || '';
        setCurrentEmpId(empId);
        setUserRole(data.role || 'employee');
        setWfhStatus(data.wfhStatus || 'เปิดสิทธิ์');
        setCheckinLogs(data.checkinLogs || []);
        setTasks(data.tasks || []);
        setSpotChecks(data.spotChecks || []);
        setActiveSpotCheck(data.activeSpotCheck || null);

        // Auto-show onboarding tour on first login
        if (isInitial && empId) {
          try {
            const viewed = localStorage.getItem(`wfh_onboarding_viewed_${empId}`);
            if (!viewed) {
              setIsOnboardingOpen(true);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    // Smooth background auto-sync without blocking user interactions
    const interval = setInterval(() => {
      fetchData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const todayCheckin = checkinLogs.find((l) => l.log_type === 'เข้างาน');
  const todayCheckout = checkinLogs.find((l) => l.log_type === 'ออกงาน');
  const todayVerify = checkinLogs.find((l) => l.log_type === 'ยืนยันตัวตน');

  // Check if employee checked in for WFH today (Only WFH checked-in employees need afternoon verification)
  const isCheckedInWfhToday = Boolean(
    todayCheckin &&
    !(
      todayCheckin.verification_status &&
      (todayCheckin.verification_status.includes('ออฟฟิศ') || todayCheckin.verification_status.includes('Office'))
    )
  );

  // Check verification, check-in, lunch break, and evening checkout windows
  const { isAfternoonVerifyWindow, isLateAfternoonVerifyWindow, isMorningMissingCheckin, isLunchBreak, isEveningCheckoutWindow } = (() => {
    try {
      const { hour: thHour, minute: thMin } = getThaiTime();
      return {
        isLunchBreak: thHour === 12,
        isAfternoonVerifyWindow: thHour === 13 && thMin >= 0 && thMin <= 20,
        isLateAfternoonVerifyWindow: (thHour === 13 && thMin > 20) || (thHour >= 14 && thHour < 18),
        isMorningMissingCheckin: (thHour > 8 || (thHour === 8 && thMin > 0)) && thHour < 18,
        isEveningCheckoutWindow: thHour >= 17,
      };
    } catch {
      return { isLunchBreak: false, isAfternoonVerifyWindow: false, isLateAfternoonVerifyWindow: false, isMorningMissingCheckin: false, isEveningCheckoutWindow: false };
    }
  })();

  // Live Work Duration & Progress calculation towards standard 8-hour workday
  const workDurationData = useMemo(() => {
    if (!todayCheckin) return null;

    const checkinTimeMs = new Date(todayCheckin.log_time).getTime();
    if (isNaN(checkinTimeMs)) return null;

    let durationMs = 0;
    const isCompleted = Boolean(todayCheckout);

    if (isCompleted && todayCheckout) {
      const checkoutTimeMs = new Date(todayCheckout.log_time).getTime();
      durationMs = Math.max(0, checkoutTimeMs - checkinTimeMs);
    } else if (nowMs > 0) {
      durationMs = Math.max(0, nowMs - checkinTimeMs);
    } else {
      return null;
    }

    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const standardWorkdayMs = 8 * 3600 * 1000;
    const progressPercent = Math.min(100, Math.round((durationMs / standardWorkdayMs) * 100));
    const is8HoursReached = durationMs >= standardWorkdayMs;

    const remainingMs = Math.max(0, standardWorkdayMs - durationMs);
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const remainingHours = Math.floor(remainingSeconds / 3600);
    const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);

    const checkinTimeDisplay = new Date(todayCheckin.log_time).toLocaleTimeString(
      lang === 'en' ? 'en-US' : 'th-TH',
      { hour: '2-digit', minute: '2-digit' }
    ) + (lang === 'en' ? '' : ' น.');

    const checkoutTimeDisplay = todayCheckout
      ? new Date(todayCheckout.log_time).toLocaleTimeString(
          lang === 'en' ? 'en-US' : 'th-TH',
          { hour: '2-digit', minute: '2-digit' }
        ) + (lang === 'en' ? '' : ' น.')
      : null;

    return {
      hours,
      minutes,
      seconds,
      progressPercent,
      is8HoursReached,
      isCompleted,
      remainingHours,
      remainingMinutes,
      checkinTimeDisplay,
      checkoutTimeDisplay,
    };
  }, [todayCheckin, todayCheckout, nowMs, lang]);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t.dashboard.title}</span>
            <Badge variant={wfhStatus === 'เปิดสิทธิ์' ? 'success' : 'destructive'}>
              {wfhStatus === 'เปิดสิทธิ์' ? t.dashboard.wfhActive : t.dashboard.wfhSuspended}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t.dashboard.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHolidayOpen(true)}
            className="text-xs gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/40 font-bold"
          >
            <Calendar className="w-3.5 h-3.5 text-orange-600" />
            <span>{t.holiday.openBtn}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSuggestionOpen(true)}
            className="text-xs gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/40 font-bold"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-teal-600" />
            <span>{t.suggestion.openBtn}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOnboardingOpen(true)}
            className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>{t.onboarding.quickGuideBtn}</span>
          </Button>
        </div>
      </div>

      {/* Lunch Break Status Banner (12:00 - 13:00) */}
      {isLunchBreak && (
        <Card className="border-teal-300 bg-teal-50/90 dark:bg-teal-950/30 dark:border-teal-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 font-bold text-xl shadow-xs">
              🍱
            </div>
            <div>
              <h3 className="font-bold text-teal-950 dark:text-teal-200 text-sm flex items-center gap-2">
                <span>{t.lunchBreak.bannerTitle}</span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-teal-600">
                  {t.lunchBreak.badge}
                </Badge>
              </h3>
              <p className="text-xs text-teal-800 dark:text-teal-300 font-medium mt-0.5">
                {t.lunchBreak.bannerDesc}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspension Alert Banner */}
      {wfhStatus === 'ระงับสิทธิ์' && (
        <Card className="border-rose-300 bg-rose-50/90 dark:bg-rose-950/30 dark:border-rose-800/40 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 dark:text-slate-100 text-sm">{t.dashboard.suspendedBannerTitle}</h3>
                <p className="text-xs text-rose-700 dark:text-slate-300 font-medium mt-0.5">
                  {t.dashboard.suspendedBannerDesc}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Morning Missing Check-in Alert Banner (After 08:00 AM) */}
      {!todayCheckin && isMorningMissingCheckin && (
        <Card className="border-rose-300 bg-rose-50/90 dark:bg-rose-950/30 dark:border-rose-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-rose-950 dark:text-slate-100 text-sm flex items-center gap-2">
                  <span>{lang === 'en' ? 'Morning Check-in Missing' : 'ยังไม่ได้ลงเวลาเข้างานช่วงเช้า'}</span>
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-rose-600">
                    {lang === 'en' ? 'Overdue > 08:00 AM' : 'เกินเวลา 08:00 น.'}
                  </Badge>
                </h3>
                <p className="text-xs text-rose-800 dark:text-slate-300 font-medium mt-0.5">
                  {lang === 'en'
                    ? 'You have not checked in this morning. Please submit your attendance with late reason.'
                    : 'ระบบตรวจพบว่าคุณยังไม่ได้ลงเวลาเข้างาน กรุณาลงเวลาและระบุเหตุผลความจำเป็นในช่องหมายเหตุ'}
                </p>
              </div>
            </div>
            <Link href="/checkin">
              <Button variant="destructive" className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1 text-xs shadow-sm">
                <span>{lang === 'en' ? 'Check-in Now' : 'ลงเวลาเข้างานทันที'}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 1. Normal Afternoon Verification Alert Banner (13:00 - 13:20) - ONLY FOR WFH WHO CHECKED IN */}
      {!todayVerify && isCheckedInWfhToday && isAfternoonVerifyWindow && (
        <Card className="border-blue-300 bg-blue-50/90 dark:bg-blue-950/30 dark:border-blue-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold animate-bounce">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <span>{t.dashboard.verifyWindowBannerTitle}</span>
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-blue-600">{t.dashboard.verifyWindowBannerBadge}</Badge>
                </h3>
                <p className="text-xs text-blue-700 dark:text-slate-300 font-medium mt-0.5">
                  {t.dashboard.verifyWindowBannerDesc}
                </p>
              </div>
            </div>
            <Link href="/checkin">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-1 text-xs shadow-sm">
                <span>{t.dashboard.verifyWindowBannerBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 2. Overdue Afternoon Verification Alert Banner (After 13:20) - ONLY FOR WFH WHO CHECKED IN */}
      {!todayVerify && isCheckedInWfhToday && isLateAfternoonVerifyWindow && (
        <Card className="border-amber-300 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-amber-950 dark:text-slate-100 text-sm flex items-center gap-2">
                  <span>{t.dashboard.overdueBannerTitle}</span>
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0 bg-amber-500 text-white border-amber-600">{t.dashboard.overdueBannerBadge}</Badge>
                </h3>
                <p className="text-xs text-amber-800 dark:text-slate-300 font-medium mt-0.5">
                  {t.dashboard.overdueBannerDesc}
                </p>
              </div>
            </div>
            <Link href="/checkin">
              <Button variant="default" className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1 text-xs shadow-sm">
                <span>{t.dashboard.overdueBannerBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pending Spot Check Alert Banner */}
      {activeSpotCheck && (
        <Card className="border-orange-200 bg-orange-50/80 dark:bg-orange-950/30 dark:border-orange-800/40">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 animate-bounce font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t.dashboard.spotcheckPendingBannerTitle}</h3>
                <p className="text-xs text-orange-700 dark:text-slate-300 font-medium">{t.dashboard.spotcheckPendingBannerDesc}</p>
              </div>
            </div>
            <Link href="/spotcheck">
              <Button variant="default" className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-1 text-xs">
                <span>{t.dashboard.spotcheckPendingBannerBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Evening Check-out Alert Banner (After 17:00 PM) - ONLY WHEN CHECKED IN AND NOT YET CHECKED OUT */}
      {todayCheckin && !todayCheckout && isEveningCheckoutWindow && (
        <Card className="border-rose-300 bg-rose-50/90 dark:bg-rose-950/30 dark:border-rose-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold animate-pulse">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-rose-950 dark:text-slate-100 text-sm flex items-center gap-2">
                  <span>{t.dashboard.checkoutBannerTitle}</span>
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-rose-600">
                    {t.dashboard.checkoutBannerBadge}
                  </Badge>
                </h3>
                <p className="text-xs text-rose-800 dark:text-slate-300 font-medium mt-0.5">
                  {t.dashboard.checkoutBannerDesc}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={() => setIsCheckoutModalOpen(true)}
                variant="destructive"
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1 text-xs shadow-sm cursor-pointer"
              >
                <span>{t.dashboard.checkoutBannerBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Work Duration Counter & Progress Bar (When checked in) */}
      {workDurationData && (
        <Card
          className={`shadow-sm transition-all duration-300 border ${
            workDurationData.isCompleted
              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 dark:from-emerald-950/20 dark:to-slate-900'
              : workDurationData.is8HoursReached
              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 dark:from-emerald-950/25 dark:to-slate-900'
              : 'border-orange-200 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 dark:from-slate-900 dark:to-slate-950'
          }`}
        >
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs font-bold ${
                    workDurationData.isCompleted || workDurationData.is8HoursReached
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300'
                  }`}
                >
                  <Timer className={`w-5 h-5 ${!workDurationData.isCompleted ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span>
                      {workDurationData.isCompleted
                        ? t.dashboard.workDurationCompletedTitle
                        : t.dashboard.workDurationTitle}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {lang === 'en' ? 'Started at' : 'เริ่มเข้างาน'}: <strong>{workDurationData.checkinTimeDisplay}</strong>
                    {workDurationData.checkoutTimeDisplay && (
                      <> • {lang === 'en' ? 'Ended at' : 'ออกงาน'}: <strong>{workDurationData.checkoutTimeDisplay}</strong></>
                    )}
                  </p>
                </div>
              </div>

              <div>
                {workDurationData.isCompleted ? (
                  <Badge variant="success" className="bg-emerald-600 text-white font-bold px-2.5 py-1 text-xs flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.dashboard.workDurationCompletedBadge}</span>
                  </Badge>
                ) : workDurationData.is8HoursReached ? (
                  <Badge variant="success" className="bg-emerald-600 text-white font-bold px-2.5 py-1 text-xs flex items-center gap-1 shadow-2xs animate-pulse">
                    <span>{t.dashboard.workDurationReachedBadge}</span>
                  </Badge>
                ) : (
                  <Badge variant="warning" className="bg-amber-500 text-white font-bold px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>{t.dashboard.workDurationActiveBadge}</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Time Counter Display */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="flex items-baseline font-mono tracking-tight text-slate-900 dark:text-slate-100">
                <span className="text-3xl sm:text-4xl font-extrabold">{workDurationData.hours}</span>
                <span className="text-xs sm:text-sm font-sans font-bold text-slate-500 ml-1 mr-3">{t.dashboard.hoursUnit}</span>

                <span className="text-3xl sm:text-4xl font-extrabold">{String(workDurationData.minutes).padStart(2, '0')}</span>
                <span className="text-xs sm:text-sm font-sans font-bold text-slate-500 ml-1 mr-3">{t.dashboard.minutesUnit}</span>

                {!workDurationData.isCompleted && (
                  <>
                    <span className="text-3xl sm:text-4xl font-extrabold text-orange-600 dark:text-orange-400">
                      {String(workDurationData.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-xs sm:text-sm font-sans font-bold text-slate-500 ml-1">{t.dashboard.secondsUnit}</span>
                  </>
                )}
              </div>

              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {workDurationData.isCompleted || workDurationData.is8HoursReached ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    ✓ {t.dashboard.workDurationGoalReached}
                  </span>
                ) : (
                  <span>
                    {t.dashboard.workDurationRemaining}: <strong className="text-slate-900 dark:text-slate-100">{workDurationData.remainingHours} {t.dashboard.hoursUnit} {workDurationData.remainingMinutes} {t.dashboard.minutesUnit}</strong> ({workDurationData.progressPercent}%)
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar towards standard 8-hour workday */}
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  workDurationData.isCompleted || workDurationData.is8HoursReached
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400'
                }`}
                style={{ width: `${workDurationData.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
              <span>{t.dashboard.workDurationStandardGoal}</span>
              <span>{workDurationData.progressPercent}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200/80 bg-emerald-50/30">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-emerald-700 font-bold">{t.dashboard.checkinTimeToday}</CardDescription>
            <CardTitle className="text-xl text-slate-900">
              {loading ? (
                <span className="flex items-center gap-2 text-sm text-slate-400 font-normal">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
                </span>
              ) : todayCheckin ? (
                new Date(todayCheckin.log_time).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', { hour: '2-digit', minute: '2-digit' }) + (lang === 'en' ? '' : ' น.')
              ) : (
                t.dashboard.notRecorded
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 font-medium">
              {todayCheckin ? `${t.common.status}: ${todayCheckin.verification_status}` : t.dashboard.notRecorded}
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-200/80 bg-rose-50/30">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-rose-700 font-bold">{t.dashboard.checkoutTimeToday}</CardDescription>
            <CardTitle className="text-xl text-slate-900">
              {loading ? (
                <span className="flex items-center gap-2 text-sm text-slate-400 font-normal">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
                </span>
              ) : todayCheckout ? (
                new Date(todayCheckout.log_time).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', { hour: '2-digit', minute: '2-digit' }) + (lang === 'en' ? '' : ' น.')
              ) : (
                t.dashboard.notRecorded
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 font-medium">
              {todayCheckout ? `${t.common.status}: ${todayCheckout.verification_status}` : t.dashboard.notRecorded}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200/80 bg-orange-50/30">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-orange-700 font-bold">{t.dashboard.dailyTaskToday}</CardDescription>
            <CardTitle className="text-xl text-slate-900">
              {loading ? (
                <span className="flex items-center gap-2 text-sm text-slate-400 font-normal">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
                </span>
              ) : tasks.length > 0 ? (
                `${tasks.length} ${lang === 'en' ? 'tasks' : 'รายการ'}`
              ) : (
                t.dashboard.notSubmitted
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 font-medium">
              {t.dashboard.dailyTaskToday}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className={`grid gap-4 ${userRole === 'supervisor' || userRole === 'admin' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <Link href="/checkin" className="block group">
          <Card className="h-full border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t.dashboard.checkinBtn}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{t.checkin.pageSubtitle}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/spotcheck" className="block group">
          <Card className="h-full border-slate-200 hover:border-orange-500 hover:shadow-md transition-all">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t.dashboard.spotcheckBtn}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{t.spotcheck.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks" className="block group">
          <Card className="h-full border-slate-200 hover:border-amber-500 hover:shadow-md transition-all">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t.dashboard.tasksBtn}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{t.tasks.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {(userRole === 'supervisor' || userRole === 'admin') && (
          <Link href="/supervisor" className="block group">
            <Card className="h-full border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.dashboard.supervisorBtn}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t.supervisor.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Onboarding Quick Guide Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        employeeId={currentEmpId}
      />

      {/* Suggestion Box Modal */}
      <SuggestionModal
        isOpen={isSuggestionOpen}
        onClose={() => setIsSuggestionOpen(false)}
        onSuccess={fetchData}
      />

      {/* Holiday Calendar Modal */}
      <HolidayCalendarModal
        isOpen={isHolidayOpen}
        onClose={() => setIsHolidayOpen(false)}
      />

      {/* Evening Check-out Modal */}
      <CheckinModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onSuccess={() => fetchData(false)}
        defaultType="ออกงาน"
      />
    </div>
  );
}
