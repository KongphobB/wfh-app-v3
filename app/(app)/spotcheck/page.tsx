'use client';

import { useState, useEffect } from 'react';
import SpotCheckModal from '@/components/SpotCheckModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellRing, RefreshCw, Clock } from 'lucide-react';
import { SpotCheck } from '@/types';
import { syncServerTime, getSyncedNow } from '@/lib/timeSync';
import { useLanguage } from '@/lib/i18n';

function isSpotCheckCurrentlyActive(s: SpotCheck): boolean {
  const isPending = s.result_status === 'Scheduled' || s.result_status === 'Pending' || s.result_status === 'รอการยืนยัน';
  if (!isPending) return false;

  const todayStr = new Date(getSyncedNow()).toISOString().split('T')[0];
  if (s.check_date !== todayStr) return false;

  let triggerTimeMs = 0;
  if (s.created_at) {
    triggerTimeMs = new Date(s.created_at).getTime();
  }
  if (!triggerTimeMs || isNaN(triggerTimeMs)) {
    triggerTimeMs = new Date(`${s.check_date}T${s.scheduled_time}+07:00`).getTime();
  }

  const nowMs = getSyncedNow();
  if (nowMs < triggerTimeMs) {
    return false;
  }

  const deadlineMs = triggerTimeMs + 10 * 60 * 1000;
  if (nowMs > deadlineMs) {
    return false;
  }

  return true;
}

export default function SpotCheckPage() {
  const { t, lang } = useLanguage();
  const [spotChecks, setSpotChecks] = useState<SpotCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCheck, setActiveCheck] = useState<SpotCheck | null>(null);
  const [modalCheck, setModalCheck] = useState<SpotCheck | null>(null);

  const fetchSpotChecks = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/spotcheck');
      if (res.ok) {
        const data = await res.json();
        if (data.server_timestamp) {
          syncServerTime(data.server_timestamp);
        }
        setSpotChecks(data.spotChecks || []);
      }
    } catch (err) {
      console.error('Fetch spot checks error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpotChecks(true);
    const interval = setInterval(() => {
      fetchSpotChecks(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pending = spotChecks.find((s: SpotCheck) => isSpotCheckCurrentlyActive(s));
    setActiveCheck(pending || null);
  }, [spotChecks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-orange-500" />
            <span>{t.spotcheck.title}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t.spotcheck.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchSpotChecks(true)}
            disabled={loading}
            className="text-xs font-bold gap-1 text-slate-600 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t.common.refresh}</span>
          </Button>
        </div>
      </div>

      {activeCheck && (
        <Card className="border-orange-200 bg-orange-50/70">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center animate-pulse shrink-0 font-bold">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{t.spotcheck.activePrompt}</h3>
                <p className="text-xs text-orange-700 font-semibold">
                  {lang === 'en' ? `Round ${activeCheck.round} — Scan selfie to confirm your location before time runs out` : `รอบ ${activeCheck.round} — สแกนถ่ายภาพ Selfie ยืนยันตำแหน่งก่อนหมดเวลา`}
                </p>
              </div>
            </div>
            <Button onClick={() => setModalCheck(activeCheck)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 cursor-pointer">
              {t.spotcheck.scanButton}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Spot Check History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span>{t.spotcheck.historyTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {spotChecks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              {t.common.noData}
            </div>
          ) : (
            <div className="space-y-3">
              {spotChecks.map((s) => {
                const isPending = s.result_status === 'Scheduled' || s.result_status === 'Pending' || s.result_status === 'รอการยืนยัน';
                const isPassed =
                  s.result_status === 'Pass' ||
                  s.result_status === 'ผ่าน' ||
                  s.result_status === 'ผ่านการสุ่มตรวจ' ||
                  (typeof s.result_status === 'string' && s.result_status.includes('ผ่าน') && !s.result_status.includes('ไม่ผ่าน'));
                const isCurrentlyActive = isSpotCheckCurrentlyActive(s);

                let triggerTimeMs = 0;
                if (s.created_at) triggerTimeMs = new Date(s.created_at).getTime();
                if (!triggerTimeMs || isNaN(triggerTimeMs)) triggerTimeMs = new Date(`${s.check_date}T${s.scheduled_time}+07:00`).getTime();
                const isUpcoming = isPending && Date.now() < triggerTimeMs;

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {lang === 'en' ? `Round ${s.round}` : `รอบ ${s.round}`} {isUpcoming ? `(${lang === 'en' ? 'Scheduled' : 'รอการสุ่มตรวจ'})` : isCurrentlyActive ? `(${lang === 'en' ? 'Ready to Scan' : 'ถึงเวลาสุ่มตรวจ'})` : `(${s.scheduled_time}${lang === 'en' ? '' : ' น.'})`}
                        </span>
                        <Badge
                          variant={
                            isPassed
                              ? 'success'
                              : isCurrentlyActive
                              ? 'warning'
                              : isUpcoming
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {isPassed
                            ? (lang === 'en' ? 'Passed' : 'ผ่านการสุ่มตรวจ')
                            : isCurrentlyActive
                            ? (lang === 'en' ? 'Pending Scan' : 'รอการยืนยันตัวตน')
                            : isUpcoming
                            ? (lang === 'en' ? 'Scheduled' : 'ยังไม่ถึงเวลาสุ่ม')
                            : (lang === 'en' ? 'Missed / Expired' : 'ไม่ผ่าน (ขาดการติดต่อ)')}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                        {lang === 'en' ? 'Date: ' : 'วันที่: '}{s.check_date}
                        {s.actual_scan_time && (
                          <span>
                            {lang === 'en' ? ' • Scanned at ' : ' • สแกนเมื่อ '}
                            {(() => {
                              try {
                                const d = new Date(s.actual_scan_time);
                                if (!isNaN(d.getTime())) {
                                  return d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + (lang === 'en' ? '' : ' น.');
                                }
                              } catch {}
                              return String(s.actual_scan_time) + (lang === 'en' ? '' : ' น.');
                            })()}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrentlyActive && (
                        <Button
                          size="sm"
                          onClick={() => setModalCheck(s)}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          {t.spotcheck.scanButton}
                        </Button>
                      )}

                      {s.photo_url && (
                        <a
                          href={s.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-orange-600 font-bold hover:underline border border-orange-200 bg-orange-50 px-3 py-1 rounded-lg"
                        >
                          {lang === 'en' ? 'View Photo ↗' : 'ดูรูปสุ่มตรวจ ↗'}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SpotCheckModal
        spotCheck={modalCheck}
        onClose={() => setModalCheck(null)}
        onSuccess={() => {
          setModalCheck(null);
          fetchSpotChecks();
        }}
      />
    </div>
  );
}
