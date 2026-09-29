'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Clock, Star, ShieldCheck, 
  TrendingUp, Calendar, RefreshCw, Award, CheckCheck,
  Users, UserCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsSummary } from '@/types';
import { useLanguage } from '@/lib/i18n';

interface AccessibleEmployee {
  id: string;
  name: string;
  dept: string;
  position: string;
  isSelf: boolean;
}

export default function AnalyticsPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeInfo, setEmployeeInfo] = useState<{ id: string; name: string; department?: string; position?: string } | null>(null);
  const [accessibleEmployees, setAccessibleEmployees] = useState<AccessibleEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [userRole, setUserRole] = useState<'admin' | 'supervisor' | 'employee'>('employee');

  const fetchAnalytics = async (targetId?: string) => {
    setLoading(true);
    try {
      const url = targetId
        ? `/api/analytics/summary?employee_id=${encodeURIComponent(targetId)}`
        : '/api/analytics/summary';
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
        setEmployeeInfo(json.employee);
        if (json.accessibleEmployees) {
          setAccessibleEmployees(json.accessibleEmployees);
        }
        if (json.userRole) {
          setUserRole(json.userRole);
        }
        if (!selectedEmployeeId && json.employee?.id) {
          setSelectedEmployeeId(json.employee.id);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleEmployeeChange = (newId: string) => {
    setSelectedEmployeeId(newId);
    fetchAnalytics(newId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-orange-600" />
            <span>{t.analytics.title}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <p className="text-xs text-slate-500">
              {t.analytics.subtitle}
            </p>
            {employeeInfo && (
              <Badge variant="outline" className="text-xs font-medium border-orange-200 bg-orange-50/80 text-orange-900 px-2 py-0.5 flex items-center gap-1 shadow-2xs">
                <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  {t.analytics.viewingStatsFor}: <strong>{employeeInfo.name}</strong> ({employeeInfo.id})
                  {employeeInfo.department ? ` • ${employeeInfo.department}` : ''}
                </span>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {accessibleEmployees.length > 1 && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
              <Users className="w-4 h-4 text-orange-600 shrink-0" />
              <label htmlFor="analytics-employee-select" className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                {t.analytics.selectTeamMember}:
              </label>
              <select
                id="analytics-employee-select"
                value={selectedEmployeeId || employeeInfo?.id || ''}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                disabled={loading}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
              >
                {accessibleEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="text-slate-900 bg-white dark:bg-slate-900 font-medium">
                    {emp.id} - {emp.name} {emp.dept ? `(${emp.dept})` : ''} {emp.isSelf ? `[${t.analytics.yourself}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(selectedEmployeeId)}
            disabled={loading}
            className="text-xs gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t.common.refresh}</span>
          </Button>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. On-time Attendance Rate */}
        <Card className="glass-card shadow-sm border border-emerald-200/80 bg-emerald-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">{t.analytics.onTimeRate}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {data ? `${data.onTimeRate}%` : '--'}
              </span>
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                {data && data.onTimeRate >= 90 ? 'ยอดเยี่ยม' : 'ปกติ'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.analytics.onTimeDesc}</p>
            {/* Progress Bar */}
            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${data?.onTimeRate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Average Star Rating */}
        <Card className="glass-card shadow-sm border border-amber-200/80 bg-amber-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">{t.analytics.avgRating}</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {data ? `${data.avgStarRating} / 5.0` : '--'}
              </span>
              <div className="flex items-center text-amber-500 text-xs">
                {'★'.repeat(Math.round(data?.avgStarRating || 5))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.analytics.avgRatingDesc}</p>
            {/* Progress Bar */}
            <div className="w-full bg-amber-200/60 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${((data?.avgStarRating || 5) / 5) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Task Completion Rate */}
        <Card className="glass-card shadow-sm border border-blue-200/80 bg-blue-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800">{t.analytics.taskCompletion}</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <CheckCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {data ? `${data.taskCompletionRate}%` : '--'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({data?.totalTasksCompleted || 0}/{data?.totalTasksAssigned || 0})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.analytics.taskCompletionDesc}</p>
            {/* Progress Bar */}
            <div className="w-full bg-blue-200/60 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${data?.taskCompletionRate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Spot Check Compliance */}
        <Card className="glass-card shadow-sm border border-purple-200/80 bg-purple-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800">{t.analytics.spotCheckRate}</span>
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {data ? `${data.spotCheckComplianceRate}%` : '--'}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300 text-purple-700">
                10-min OK
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.analytics.spotCheckDesc}</p>
            {/* Progress Bar */}
            <div className="w-full bg-purple-200/60 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${data?.spotCheckComplianceRate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7-Day Performance & Attendance Timeline */}
      <Card className="glass-card shadow-sm border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <span>{t.analytics.weeklyTrend}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {data?.dailyTrends.map((day, idx) => (
              <div
                key={day.date || idx}
                className={`p-3.5 rounded-2xl border text-center flex flex-col justify-between space-y-2 transition-all ${
                  day.checkinStatus === 'on-time'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : day.checkinStatus === 'late'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : day.checkinStatus === 'leave'
                    ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{day.dayLabel}</span>
                  <div className="mt-1">
                    {day.checkinStatus === 'on-time' && (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0 bg-emerald-600">เข้างานตรงเวลา</Badge>
                    )}
                    {day.checkinStatus === 'late' && (
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0 bg-amber-500 text-white">เข้างานสาย</Badge>
                    )}
                    {day.checkinStatus === 'leave' && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-blue-600">ลางาน/Onsite</Badge>
                    )}
                    {day.checkinStatus === 'missing' && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">ไม่ลงเวลา</Badge>
                    )}
                    {day.checkinStatus === 'none' && (
                      <span className="text-[10px] text-slate-400">วันหยุด</span>
                    )}
                  </div>
                </div>

                {day.checkinTime && (
                  <span className="text-[11px] font-mono text-slate-500">
                    🕒 {day.checkinTime}
                  </span>
                )}

                {day.starRating && (
                  <div className="text-amber-500 text-xs font-bold">
                    {'★'.repeat(day.starRating)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Analytics Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Star Rating Distribution */}
        <Card className="glass-card shadow-sm border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>{t.analytics.starDistribution}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data?.starDistribution[star] || 0;
              const total = data?.totalRatingsCount || 1;
              const pct = Math.round((count / (total || 1)) * 100);

              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-14 font-bold text-slate-700 flex items-center gap-1">
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${
                        star >= 4 ? 'bg-amber-400' : star === 3 ? 'bg-blue-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono font-bold text-slate-600">
                    {count} ครั้ง
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Monthly Attendance Scorecard */}
        <Card className="glass-card shadow-sm border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <span>{t.analytics.attendanceSummary}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">{t.analytics.workdays}</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{data?.totalWorkdays || 0} วัน</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-xs text-emerald-700">{t.analytics.onTimeDays}</span>
                <p className="text-2xl font-extrabold text-emerald-800 mt-1">{data?.onTimeCheckinCount || 0} วัน</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
                <span className="text-xs text-amber-700">{t.analytics.lateDays}</span>
                <p className="text-2xl font-extrabold text-amber-800 mt-1">{data?.lateCheckinCount || 0} วัน</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                <span className="text-xs text-blue-700">{t.analytics.leaveDays}</span>
                <p className="text-2xl font-extrabold text-blue-800 mt-1">{data?.leaveDaysCount || 0} วัน</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
