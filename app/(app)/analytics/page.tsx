'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Clock, Star, CheckCircle2, ShieldCheck, 
  TrendingUp, Calendar, RefreshCw, Award, AlertCircle, FileText, CheckCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsSummary } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function AnalyticsPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeInfo, setEmployeeInfo] = useState<{ id: string; name: string } | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/summary');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
        setEmployeeInfo(json.employee);
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-orange-600" />
            <span>{t.analytics.title}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t.analytics.subtitle} {employeeInfo ? `(${employeeInfo.name})` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="text-xs gap-1.5"
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
