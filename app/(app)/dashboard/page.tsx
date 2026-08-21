'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, Clock, MapPin, AlertTriangle, FileText, 
  HelpCircle, Star, RefreshCw, ChevronRight, ShieldCheck, BellRing, Loader2, ShieldAlert
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckinLog, TaskItem, SpotCheck } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [spotChecks, setSpotChecks] = useState<SpotCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpotCheck, setActiveSpotCheck] = useState<SpotCheck | null>(null);
  const [userRole, setUserRole] = useState<string>('employee');
  const [wfhStatus, setWfhStatus] = useState<string>('เปิดสิทธิ์');

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role || 'employee');
        setWfhStatus(data.wfhStatus || 'เปิดสิทธิ์');
        setCheckinLogs(data.checkinLogs || []);
        setTasks(data.tasks || []);
        setSpotChecks(data.spotChecks || []);
        setActiveSpotCheck(data.activeSpotCheck || null);
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

  // Check afternoon verification windows
  const { isAfternoonVerifyWindow, isLateAfternoonVerifyWindow } = (() => {
    try {
      const thaiTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok', hour12: false });
      const [thHourStr, thMinStr] = thaiTimeStr.split(':');
      const thHour = parseInt(thHourStr, 10);
      const thMin = parseInt(thMinStr, 10);
      return {
        isAfternoonVerifyWindow: thHour === 13 && thMin >= 0 && thMin <= 20,
        isLateAfternoonVerifyWindow: (thHour === 13 && thMin > 20) || (thHour >= 14 && thHour < 18),
      };
    } catch {
      return { isAfternoonVerifyWindow: false, isLateAfternoonVerifyWindow: false };
    }
  })();

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
      </div>

      {/* Suspension Alert Banner */}
      {wfhStatus === 'ระงับสิทธิ์' && (
        <Card className="border-rose-300 bg-rose-50/90 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 text-sm">{t.dashboard.suspendedBannerTitle}</h3>
                <p className="text-xs text-rose-700 font-medium mt-0.5">
                  {t.dashboard.suspendedBannerDesc}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. Normal Afternoon Verification Alert Banner (13:00 - 13:20) - ONLY FOR WFH WHO CHECKED IN */}
      {!todayVerify && isCheckedInWfhToday && isAfternoonVerifyWindow && (
        <Card className="border-blue-300 bg-blue-50/90 shadow-sm animate-fade-in">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold animate-bounce">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                  <span>{t.dashboard.verifyWindowBannerTitle}</span>
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-blue-600">{t.dashboard.verifyWindowBannerBadge}</Badge>
                </h3>
                <p className="text-xs text-blue-700 font-medium mt-0.5">
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
        <Card className="border-amber-300 bg-amber-50/90 shadow-sm animate-fade-in">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold animate-pulse">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                  <span>{t.dashboard.overdueBannerTitle}</span>
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0 bg-amber-500 text-white border-amber-600">{t.dashboard.overdueBannerBadge}</Badge>
                </h3>
                <p className="text-xs text-amber-800 font-medium mt-0.5">
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
        <Card className="border-orange-200 bg-orange-50/80">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 animate-bounce font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{t.dashboard.spotcheckPendingBannerTitle}</h3>
                <p className="text-xs text-orange-700 font-medium">{t.dashboard.spotcheckPendingBannerDesc}</p>
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
    </div>
  );
}
