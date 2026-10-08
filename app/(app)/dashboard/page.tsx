'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, MapPin, AlertTriangle, FileText, 
  ChevronRight, ShieldCheck, BellRing, Loader2, ShieldAlert, Sparkles, MessageSquarePlus, Calendar, LogOut,
  CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CheckinModal from '@/components/CheckinModal';
import DailyTaskModal from '@/components/DailyTaskModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { SuggestionModal } from '@/components/SuggestionModal';
import { HolidayCalendarModal } from '@/components/HolidayCalendarModal';
import { CheckinLog, TaskItem, SpotCheck } from '@/types';
import { useLanguage } from '@/lib/i18n';
import { getThaiTime, getThaiDateStr } from '@/lib/timeSync';

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [spotChecks, setSpotChecks] = useState<SpotCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpotCheck, setActiveSpotCheck] = useState<SpotCheck | null>(null);
  const [userRole, setUserRole] = useState<string>('employee');
  const [wfhStatus, setWfhStatus] = useState<string>('เปิดสิทธิ์');
  const [workLocationToday, setWorkLocationToday] = useState<'office' | 'wfh'>('office');
  const [resolvedDailyStatus, setResolvedDailyStatus] = useState<string>('office');
  const [dailyStatusReason, setDailyStatusReason] = useState<string>('');
  const [isExemptFromMissingCheckin, setIsExemptFromMissingCheckin] = useState<boolean>(true);
  const [currentEmpId, setCurrentEmpId] = useState<string>('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isHolidayOpen, setIsHolidayOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

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

        // Check client-side daily locations if available (e.g. recent toggle in Admin on same browser)
        let locToday: 'office' | 'wfh' = data.workLocationToday || 'office';
        try {
          const todayDateStr = getThaiDateStr();
          const raw = localStorage.getItem(`wfh_daily_locations_${todayDateStr}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed[empId]) {
              locToday = parsed[empId];
            }
          }
        } catch {}

        setWorkLocationToday(locToday);
        setResolvedDailyStatus(data.resolvedDailyStatus || (locToday === 'office' ? 'office' : 'wfh'));
        setDailyStatusReason(data.dailyStatusReason || '');
        setIsExemptFromMissingCheckin(
          data.isExemptFromMissingCheckin != null
            ? (locToday === 'office' ? true : data.isExemptFromMissingCheckin)
            : locToday === 'office'
        );

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

    // Visibility-aware background auto-sync (45s when tab active, instant on focus)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchData(false);
    }, 45000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const todayCheckin = checkinLogs.find((l) => l.log_type === 'เข้างาน');
  const todayCheckout = checkinLogs.find((l) => l.log_type === 'ออกงาน');
  const todayVerify = checkinLogs.find((l) => l.log_type === 'ยืนยันตัวตน');
  const todayDateStr = getThaiDateStr();
  const todayTask = tasks.find((t) => t.submit_date === todayDateStr);

  // Derived location and exemption flags
  const isOfficeToday = workLocationToday === 'office' || resolvedDailyStatus === 'office';
  const isExemptFromMissing = isOfficeToday || isExemptFromMissingCheckin || resolvedDailyStatus === 'holiday' || resolvedDailyStatus === 'leave';

  // Check if employee checked in for WFH today (Only WFH checked-in employees need afternoon verification)
  const isCheckedInWfhToday = Boolean(
    todayCheckin &&
    !isOfficeToday &&
    !(
      todayCheckin.verification_status &&
      (todayCheckin.verification_status.includes('ออฟฟิศ') || todayCheckin.verification_status.includes('Office'))
    )
  );

  // Check verification, check-in, lunch break, evening checkout, and evening task reminder windows
  const { isAfternoonVerifyWindow, isLateAfternoonVerifyWindow, isMorningMissingCheckin, isLunchBreak, isEveningCheckoutWindow, isEveningTaskReminderWindow } = (() => {
    try {
      const { hour: thHour, minute: thMin } = getThaiTime();
      return {
        isLunchBreak: thHour === 12,
        isAfternoonVerifyWindow: thHour === 13 && thMin >= 0 && thMin <= 20,
        isLateAfternoonVerifyWindow: (thHour === 13 && thMin > 20) || (thHour >= 14 && thHour < 18),
        isMorningMissingCheckin: (thHour > 8 || (thHour === 8 && thMin > 0)) && thHour < 18,
        isEveningCheckoutWindow: thHour >= 17,
        isEveningTaskReminderWindow: (thHour === 16 && thMin >= 30) || (thHour === 17 && thMin === 0),
      };
    } catch {
      return { isLunchBreak: false, isAfternoonVerifyWindow: false, isLateAfternoonVerifyWindow: false, isMorningMissingCheckin: false, isEveningCheckoutWindow: false, isEveningTaskReminderWindow: false };
    }
  })();


  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.dashboard.title}
            </h1>
            <Badge variant={wfhStatus === 'เปิดสิทธิ์' ? 'success' : 'destructive'} className="text-[10px] px-2 py-0.5 font-bold">
              {wfhStatus === 'เปิดสิทธิ์' ? t.dashboard.wfhActive : t.dashboard.wfhSuspended}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 font-bold ${
                isOfficeToday
                  ? 'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/40'
                  : 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40'
              }`}
            >
              {isOfficeToday ? t.dashboard.officeBadge : t.dashboard.wfhBadge}
            </Badge>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">{t.dashboard.subtitle}</p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHolidayOpen(true)}
            className="h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/40 font-bold rounded-xl shrink-0 cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-orange-600" />
            <span>{t.holiday.openBtn}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSuggestionOpen(true)}
            className="h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/40 font-bold rounded-xl shrink-0 cursor-pointer shadow-2xs"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-teal-600" />
            <span>{t.suggestion.openBtn}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOnboardingOpen(true)}
            className="h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 font-bold rounded-xl shrink-0 cursor-pointer shadow-2xs"
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
                <Badge className="text-[10px] px-1.5 py-0 bg-teal-600 text-white border-transparent font-bold">
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

      {/* Office Mode Status Banner (Biometric Face Scan at Company) */}
      {isOfficeToday && !todayCheckin && (
        <Card className="border-blue-200/90 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 font-bold text-xl mt-0.5 shadow-xs">
                🏢
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-blue-950 dark:text-slate-100 text-sm leading-tight">
                    {t.dashboard.officeModeTitle}
                  </h3>
                  <Badge className="text-[10px] px-2 py-0.5 bg-blue-600 text-white border-transparent shrink-0 font-bold">
                    {t.dashboard.officeModeBadge}
                  </Badge>
                </div>
                <p className="text-xs text-blue-800 dark:text-slate-300 font-medium leading-relaxed">
                  {t.dashboard.officeModeDesc}
                </p>
              </div>
            </div>
            <Link href="/checkin" className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
              <Button variant="outline" className="w-full sm:w-auto border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50 font-bold text-xs py-2.5 shadow-2xs cursor-pointer">
                <span>{t.dashboard.officeModeBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Morning Missing Check-in Alert Banner (After 08:00 AM) - Only for WFH employees */}
      {!todayCheckin && !isExemptFromMissing && isMorningMissingCheckin && (
        <Card className="border-rose-300 bg-rose-50/90 dark:bg-rose-950/30 dark:border-rose-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold animate-pulse mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-rose-950 dark:text-slate-100 text-sm leading-tight">
                    {lang === 'en' ? 'Morning Check-in Missing' : 'ยังไม่ได้ลงเวลาเข้างานช่วงเช้า'}
                  </h3>
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5 bg-rose-600 text-white border-transparent shrink-0 font-bold">
                    {lang === 'en' ? 'Overdue > 08:00 AM' : 'เกินเวลา 08:00 น.'}
                  </Badge>
                </div>
                <p className="text-xs text-rose-800 dark:text-slate-300 font-medium leading-relaxed">
                  {lang === 'en'
                    ? 'You have not checked in this morning. Please submit your attendance with late reason.'
                    : 'ระบบตรวจพบว่าคุณยังไม่ได้ลงเวลาเข้างาน กรุณาลงเวลาและระบุเหตุผลความจำเป็นในช่องหมายเหตุ'}
                </p>
              </div>
            </div>
            <Link href="/checkin" className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
              <Button variant="destructive" className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1 text-xs py-2.5 shadow-sm cursor-pointer">
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
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold animate-bounce mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-blue-900 dark:text-slate-100 text-sm leading-tight">
                    {t.dashboard.verifyWindowBannerTitle}
                  </h3>
                  <Badge className="text-[10px] px-2 py-0.5 bg-blue-600 text-white border-transparent shrink-0 font-bold">
                    {t.dashboard.verifyWindowBannerBadge}
                  </Badge>
                </div>
                <p className="text-xs text-blue-700 dark:text-slate-300 font-medium leading-relaxed">
                  {t.dashboard.verifyWindowBannerDesc}
                </p>
              </div>
            </div>
            <Link href="/checkin" className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
              <Button variant="default" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold gap-1 text-xs py-2.5 shadow-sm cursor-pointer">
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
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold animate-pulse mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-amber-950 dark:text-slate-100 text-sm leading-tight">
                    {t.dashboard.overdueBannerTitle}
                  </h3>
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 bg-amber-500 text-white border-amber-600 shrink-0 font-bold">
                    {t.dashboard.overdueBannerBadge}
                  </Badge>
                </div>
                <p className="text-xs text-amber-800 dark:text-slate-300 font-medium leading-relaxed">
                  {t.dashboard.overdueBannerDesc}
                </p>
              </div>
            </div>
            <Link href="/checkin" className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
              <Button variant="default" className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1 text-xs py-2.5 shadow-sm cursor-pointer">
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
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 animate-bounce font-bold mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">{t.dashboard.spotcheckPendingBannerTitle}</h3>
                <p className="text-xs text-orange-700 dark:text-slate-300 font-medium leading-relaxed">{t.dashboard.spotcheckPendingBannerDesc}</p>
              </div>
            </div>
            <Link href="/spotcheck" className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
              <Button variant="default" className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold gap-1 text-xs py-2.5 shadow-sm cursor-pointer">
                <span>{t.dashboard.spotcheckPendingBannerBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Evening Task Reminder Alert Banner (16:30 - 17:00 PM) - WHEN WFH CHECKED IN, NOT CHECKED OUT, AND NO TASK YET */}
      {isCheckedInWfhToday && !todayTask && !todayCheckout && isEveningTaskReminderWindow && (
        <Card className="border-amber-300 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold animate-pulse mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-amber-950 dark:text-slate-100 text-sm leading-tight">
                    {t.dashboard.eveningTaskReminderTitle}
                  </h3>
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 bg-amber-600 text-white shrink-0 font-bold">
                    {t.dashboard.eveningTaskReminderBadge}
                  </Badge>
                </div>
                <p className="text-xs text-amber-800 dark:text-slate-300 font-medium leading-relaxed">
                  {t.dashboard.eveningTaskReminderDesc}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
              <Button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1 text-xs py-2.5 shadow-sm cursor-pointer"
              >
                <span>{t.dashboard.eveningTaskReminderBtn}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evening Check-out Alert Banner (After 17:00 PM) - ONLY WHEN CHECKED IN AND NOT YET CHECKED OUT */}
      {todayCheckin && !todayCheckout && isEveningCheckoutWindow && (
        <Card className="border-rose-300 bg-rose-50/90 dark:bg-rose-950/30 dark:border-rose-800/40 shadow-sm animate-fade-in">
          <CardContent className="p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold animate-pulse mt-0.5">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-rose-950 dark:text-slate-100 text-sm leading-tight">
                      {t.dashboard.checkoutBannerTitle}
                    </h3>
                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5 bg-rose-600 text-white border-transparent shrink-0 font-bold">
                      {t.dashboard.checkoutBannerBadge}
                    </Badge>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-slate-300 font-medium leading-relaxed">
                    {t.dashboard.checkoutBannerDesc}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
                <Button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(true)}
                  variant="destructive"
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1 text-xs py-2.5 shadow-sm cursor-pointer"
                >
                  <span>{t.dashboard.checkoutBannerBtn}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Daily Task Submission prompt before checkout */}
            <div className="pt-2.5 border-t border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              {todayTask ? (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      ✓ {lang === 'en' ? 'Submitted today: ' : 'ส่งรายงานวันนี้แล้ว: '}
                      <strong className="text-emerald-700">เสร็จ {todayTask.tasks_completed} งาน</strong>
                      {todayTask.tasks_remaining != null && todayTask.tasks_remaining > 0 && (
                        <span className="text-amber-700 font-bold ml-1.5">
                          • ต่อพรุ่งนี้ {todayTask.tasks_remaining} งาน
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="text-[11px] text-orange-600 hover:underline font-bold text-left sm:text-right cursor-pointer"
                  >
                    {t.tasks.editTodayReport}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-rose-900 font-medium">
                    <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>💡 {t.tasks.beforeCheckoutPrompt} (เสร็จกี่งาน / ยกยอดต่อพรุ่งนี้กี่งาน)</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-7 px-3 rounded-xl shrink-0 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    <span>{t.tasks.reportBtn}</span>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200/80 bg-emerald-50/30">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-emerald-700 font-bold">{t.dashboard.checkinTimeToday}</CardDescription>
            <CardTitle className="text-xl text-slate-900 dark:text-white">
              {loading ? (
                <span className="flex items-center gap-2 text-sm text-slate-400 font-normal">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
                </span>
              ) : todayCheckin ? (
                new Date(todayCheckin.log_time).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', { hour: '2-digit', minute: '2-digit' }) + (lang === 'en' ? '' : ' น.')
              ) : isOfficeToday ? (
                <span className="text-blue-700 dark:text-blue-300 text-base font-bold flex items-center gap-1.5">
                  <span>🏢 {t.dashboard.officeScanRecorded}</span>
                </span>
              ) : (
                t.dashboard.notRecorded
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 font-medium">
              {todayCheckin
                ? `${t.common.status}: ${todayCheckin.verification_status}`
                : isOfficeToday
                ? t.dashboard.officeScanDetail
                : t.dashboard.notRecorded}
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-200/80 bg-rose-50/30">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-rose-700 font-bold">{t.dashboard.checkoutTimeToday}</CardDescription>
            <CardTitle className="text-xl text-slate-900 dark:text-white">
              {loading ? (
                <span className="flex items-center gap-2 text-sm text-slate-400 font-normal">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
                </span>
              ) : todayCheckout ? (
                new Date(todayCheckout.log_time).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', { hour: '2-digit', minute: '2-digit' }) + (lang === 'en' ? '' : ' น.')
              ) : isOfficeToday ? (
                <span className="text-blue-700 dark:text-blue-300 text-base font-bold flex items-center gap-1.5">
                  <span>🏢 {t.dashboard.officeScanRecorded}</span>
                </span>
              ) : (
                t.dashboard.notRecorded
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 font-medium">
              {todayCheckout
                ? `${t.common.status}: ${todayCheckout.verification_status}`
                : isOfficeToday
                ? t.dashboard.officeScanDetail
                : t.dashboard.notRecorded}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200/80 bg-orange-50/30">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-orange-700 font-bold flex items-center justify-between">
              <span>{t.dashboard.dailyTaskToday}</span>
              {todayTask && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  ✓ ส่งแล้ว
                </span>
              )}
            </CardDescription>
            <CardTitle className="text-base sm:text-lg text-slate-900 dark:text-white">
              {loading ? (
                <span className="flex items-center gap-2 text-sm text-slate-400 font-normal">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
                </span>
              ) : todayTask ? (
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-emerald-700 font-black">
                    เสร็จ {todayTask.tasks_completed} งาน
                  </span>
                  {todayTask.tasks_remaining != null && todayTask.tasks_remaining > 0 && (
                    <span className="text-xs text-amber-700 font-bold">
                      (ต่อพรุ่งนี้ {todayTask.tasks_remaining})
                    </span>
                  )}
                </div>
              ) : isOfficeToday ? (
                <span className="text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center gap-1.5">
                  <span>🏢 {t.dashboard.officeTaskExempt}</span>
                </span>
              ) : (
                <span className="text-rose-600 text-sm font-bold">
                  {t.dashboard.notSubmitted}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>
                {todayTask
                  ? (lang === 'en' ? 'Report submitted before leaving' : 'รายงานก่อนเลิกงานเรียบร้อย')
                  : isOfficeToday
                  ? t.dashboard.officeTaskDetail
                  : (lang === 'en' ? 'Report before leaving' : 'ส่งรายงานสรุปก่อนเลิกงาน')}
              </span>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="text-orange-600 font-bold hover:underline cursor-pointer"
              >
                {todayTask ? t.tasks.editTodayReport : (isOfficeToday ? (lang === 'en' ? 'Report (Optional)' : 'ส่งรายงาน (ถ้ามี)') : t.tasks.reportBtn)}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className={`grid gap-3 sm:gap-4 ${userRole === 'supervisor' || userRole === 'admin' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
        <Link href="/checkin" className="block group">
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md transition-all">
            <CardContent className="p-3.5 sm:p-5 flex flex-col justify-between h-full">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{t.dashboard.checkinBtn}</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{t.checkin.pageSubtitle}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/spotcheck" className="block group">
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-orange-500 hover:shadow-md transition-all">
            <CardContent className="p-3.5 sm:p-5 flex flex-col justify-between h-full">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{t.dashboard.spotcheckBtn}</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{t.spotcheck.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks" className={`block group ${userRole === 'supervisor' || userRole === 'admin' ? '' : 'col-span-2 sm:col-span-1'}`}>
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:shadow-md transition-all">
            <CardContent className="p-3.5 sm:p-5 flex flex-col justify-between h-full">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{t.dashboard.tasksBtn}</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{t.tasks.subtitle}</p>
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

      {/* Daily Task Submission Modal (Before leaving work) */}
      <DailyTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => fetchData(false)}
        existingTask={todayTask}
      />
    </div>
  );
}
