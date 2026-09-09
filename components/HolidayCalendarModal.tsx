'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, FileText, 
  Download, Clock, Eye, Palmtree
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { CompanyHoliday, HolidayPolicyDoc } from '@/types';

interface HolidayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HolidayCalendarModal({ isOpen, onClose }: HolidayCalendarModalProps) {
  const { t, lang } = useLanguage();
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [policyDoc, setPolicyDoc] = useState<HolidayPolicyDoc | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [loading, setLoading] = useState<boolean>(true);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/holidays')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHolidays(data.holidays || []);
          setPolicyDoc(data.policyDoc || null);
        }
      })
      .catch((err) => console.error('Fetch holidays error:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Months labels
  const monthNamesTh = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNamesTh = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthName = lang === 'en' ? monthNamesEn[currentMonth] : monthNamesTh[currentMonth];
  const yearDisplay = lang === 'en' ? `${currentYear}` : `พ.ศ. ${currentYear + 543}`;

  // Calendar matrix computation
  const { daysInMonth, firstDayOfWeek, monthHolidays } = useMemo(() => {
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const mHols = holidays.filter((h) => h.is_active && h.date.startsWith(monthPrefix));

    return { daysInMonth: days, firstDayOfWeek: firstDay, monthHolidays: mHols };
  }, [currentYear, currentMonth, holidays]);

  // Upcoming holidays across the next 60 days
  const upcomingHolidays = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMs = new Date(todayStr).getTime();

    return holidays
      .filter((h) => h.is_active && h.date >= todayStr)
      .map((h) => {
        const holMs = new Date(h.date).getTime();
        const diffDays = Math.ceil((holMs - todayMs) / (1000 * 60 * 60 * 24));
        return { ...h, diffDays };
      })
      .slice(0, 5);
  }, [holidays]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 bg-white relative max-h-[94vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center font-bold shrink-0">
            <Palmtree className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>{t.holiday.modalTitle}</span>
              <Badge variant="default" className="bg-orange-500 text-white text-[10px]">
                {holidays.filter((h) => h.is_active).length} {lang === 'en' ? 'Days' : 'วัน'}
              </Badge>
            </h2>
            <p className="text-xs text-slate-500">{t.holiday.modalSubtitle}</p>
          </div>
        </div>

        {/* Official Attached Policy Document Card */}
        {policyDoc && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-orange-50/90 via-amber-50/80 to-white dark:from-orange-950/30 dark:to-slate-900 border border-orange-200/90 dark:border-orange-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                  <span>{t.holiday.policyDocTitle}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-200/80 dark:bg-orange-900/60 text-orange-800 dark:text-orange-300 font-mono font-bold">
                    {policyDoc.file_type.toUpperCase()}
                  </span>
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                  {policyDoc.file_name} {policyDoc.file_size ? `(${policyDoc.file_size})` : ''} • {t.holiday.policyDocSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewDocUrl(policyDoc.file_url)}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t.holiday.viewDocBtn}</span>
              </button>
              <a
                href={policyDoc.file_url}
                download={policyDoc.file_name}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 hover:bg-orange-50 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.holiday.downloadDocBtn}</span>
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Calendar View (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                {monthName} {yearDisplay}
              </h3>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400">
              {(lang === 'en' ? dayNamesEn : dayNamesTh).map((d, i) => (
                <div key={d} className={`py-1 ${i === 0 || i === 6 ? 'text-rose-500 font-bold' : ''}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 rounded-xl bg-slate-50/40 dark:bg-slate-900/20" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const hol = monthHolidays.find((h) => h.date === dateStr);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                return (
                  <div
                    key={dateStr}
                    className={`h-16 p-1.5 rounded-xl border flex flex-col justify-between transition-all ${
                      hol
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 shadow-2xs'
                        : isToday
                        ? 'bg-blue-50/70 border-blue-300 dark:bg-blue-950/30'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]'
                            : hol
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {hol && <span className="text-[10px]">🏖️</span>}
                    </div>

                    {hol && (
                      <p
                        title={lang === 'en' && hol.name_en ? hol.name_en : hol.name}
                        className="text-[9px] font-bold text-orange-900 dark:text-orange-200 leading-tight line-clamp-2 truncate"
                      >
                        {lang === 'en' && hol.name_en ? hol.name_en : hol.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* List of holidays in this month */}
            {monthHolidays.length > 0 ? (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <span>📅 วันหยุดในเดือน {monthName}:</span>
                </h4>
                <div className="space-y-1.5 text-xs">
                  {monthHolidays.map((hol) => (
                    <div key={hol.id} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <Badge variant="outline" className="text-[10px] bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 shrink-0 font-mono">
                        {hol.date.split('-')[2]} {monthName}
                      </Badge>
                      <span className="font-semibold">{lang === 'en' && hol.name_en ? hol.name_en : hol.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">
                {lang === 'en' ? 'No holidays in this month' : `ไม่มีวันหยุดในเดือน ${monthName}`}
              </p>
            )}
          </div>

          {/* Upcoming Holidays Sidebar (1 Col) */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>{t.holiday.upcomingTitle}</span>
              </h3>

              {upcomingHolidays.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">{t.holiday.upcomingEmpty}</p>
              ) : (
                <div className="space-y-2.5">
                  {upcomingHolidays.map((hol) => {
                    const [y, m, d] = hol.date.split('-');
                    const mIndex = parseInt(m, 10) - 1;
                    const mName = lang === 'en' ? monthNamesEn[mIndex] : monthNamesTh[mIndex];

                    return (
                      <div
                        key={hol.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400">
                            {parseInt(d, 10)} {mName}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              hol.diffDays === 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                            }`}
                          >
                            {hol.diffDays === 0
                              ? t.holiday.todayText
                              : t.holiday.daysLeftText.replace('{days}', String(hol.diffDays))}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-tight">
                          {lang === 'en' && hol.name_en ? hol.name_en : hol.name}
                        </h4>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {hol.type === 'official' ? t.holiday.officialBadge : t.holiday.companyBadge}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick action to go to leave page */}
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2 text-xs">
              <h4 className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <span>🏖️ วางแผนลาพักร้อนล่วงหน้า</span>
              </h4>
              <p className="text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                นำวันหยุดประจำปีไปวางแผนยื่นขอลาพักผ่อนในระบบล่วงหน้า เพื่อให้หัวหน้างานจัดตารางงานได้ทันท่วงที
              </p>
              <a
                href="/leave"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-1"
              >
                <span>ไปที่หน้าขอลาหยุด ↗</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button onClick={onClose} variant="outline" className="text-xs">
            {t.common.close}
          </Button>
        </div>
      </div>

      {/* Official Holiday Announcement Document Lightbox with Zoom & Readability Controls */}
      {previewDocUrl && (
        <DocumentViewerModal
          policyDoc={policyDoc}
          previewDocUrl={previewDocUrl}
          holidays={holidays}
          lang={lang}
          onClose={() => setPreviewDocUrl(null)}
        />
      )}
    </div>
  );
}

interface DocumentViewerModalProps {
  policyDoc: HolidayPolicyDoc | null;
  previewDocUrl: string;
  holidays: CompanyHoliday[];
  lang: string;
  onClose: () => void;
}

function DocumentViewerModal({ policyDoc, previewDocUrl, holidays, lang, onClose }: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState<number>(120); // 120% default for clear readable text
  const [viewTab, setViewTab] = useState<'image' | 'table'>('image');

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 75));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-5xl max-h-[94vh] w-full bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                {policyDoc?.file_name || 'ประกาศวันหยุดประจำปี 2569'}
              </h3>
              <p className="text-[11px] text-slate-500">
                SNU Supply and Service Co., Ltd. • {policyDoc?.file_size || ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewTab('image')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewTab === 'image'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🖼️ ภาพประกาศต้นฉบับ
              </button>
              <button
                type="button"
                onClick={() => setViewTab('table')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewTab === 'table'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                📋 ตารางข้อความอ่านง่าย
              </button>
            </div>

            {policyDoc && (
              <a
                href={policyDoc.file_url}
                download={policyDoc.file_name}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col pt-3 min-h-[60vh] max-h-[76vh]">
          {viewTab === 'image' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Zoom Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 mb-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  💡 แนะนำ: ใช้ปุ่มขยาย (+) หรือเลื่อนเมาส์เพื่ออ่านข้อความขนาดใหญ่คมชัด
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 75}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    title="ย่อขนาด"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[45px] text-center">
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 250}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    title="ขยายขนาด"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    รีเซ็ต
                  </button>
                </div>
              </div>

              {/* Scrollable Zoom Area */}
              <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex justify-center items-start">
                <div
                  style={{ width: `${zoom}%`, transition: 'width 0.15s ease-out' }}
                  className="flex justify-center max-w-none"
                >
                  <img
                    src={previewDocUrl}
                    alt="SNU Company Holiday Announcement"
                    className="w-full max-w-4xl h-auto object-contain rounded-xl shadow-xl bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Readable High-Contrast Table View */
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="p-3.5 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-200 dark:border-orange-900/50 text-xs">
                <h4 className="font-bold text-orange-950 dark:text-orange-200 text-sm">
                  🏢 SNU SUPPLY AND SERVICE CO., LTD.
                </h4>
                <p className="text-orange-900 dark:text-orange-300 text-xs mt-0.5 font-medium">
                  ประกาศบริษัท ที่ 005/2568 เรื่อง วันหยุดนักขัตฤกษ์ ประจำปี 2569 (รวม 15 วัน)
                </p>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                {holidays.map((h, index) => {
                  const dateObj = new Date(h.date);
                  const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
                  const dayTh = dayNames[dateObj.getDay()];
                  const monthThNames = [
                    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                  ];
                  const [y, m, d] = h.date.split('-');
                  const formattedDate = `${dayTh} ที่ ${parseInt(d, 10)} ${monthThNames[parseInt(m, 10) - 1]} พ.ศ. 2569`;

                  return (
                    <div
                      key={h.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {h.name}
                          </h4>
                          {h.name_en && (
                            <p className="text-xs text-slate-400 mt-0.5">{h.name_en}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 sm:text-right pl-9 sm:pl-0">
                        <span className="font-bold text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-800/60">
                          📅 {formattedDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
