'use client';

import { useState, useEffect } from 'react';
import SpotCheckModal from '@/components/SpotCheckModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellRing, RefreshCw, Clock } from 'lucide-react';
import { SpotCheck } from '@/types';

export default function SpotCheckPage() {
  const [spotChecks, setSpotChecks] = useState<SpotCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCheck, setActiveCheck] = useState<SpotCheck | null>(null);

  const fetchSpotChecks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spotcheck');
      if (res.ok) {
        const data = await res.json();
        const list = data.spotChecks || [];
        setSpotChecks(list);
        const pending = list.find((s: SpotCheck) => s.result_status === 'Pending');
        setActiveCheck(pending || null);
      }
    } catch (err) {
      console.error('Fetch spot checks error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpotChecks();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-orange-500" />
            <span>สุ่มตรวจยืนยันตัวตน (Spot Check)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ระบบจะสุ่มตรวจรอบเช้า (10:00 น.) และรอบบ่าย (15:00 น.) กรุณาสแกนยืนยันตัวตนเมื่อรับแจ้งเตือน
          </p>
        </div>

        <Button onClick={fetchSpotChecks} variant="outline" size="sm" disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชข้อมูล</span>
        </Button>
      </div>

      {activeCheck && (
        <Card className="border-orange-200 bg-orange-50/70">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center animate-pulse shrink-0 font-bold">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">มีรายการสุ่มตรวจที่ต้องตอบกลับ!</h3>
                <p className="text-xs text-orange-700 font-semibold">
                  รอบ{activeCheck.round} ({activeCheck.scheduled_time} น.) — สแกนถ่ายภาพ Selfie ยืนยันตำแหน่ง
                </p>
              </div>
            </div>
            <Button onClick={() => setActiveCheck(activeCheck)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
              เปิดกล้องสแกนตัวตน
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Spot Check History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span>ประวัติการสุ่มตรวจทั้งหมด</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {spotChecks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              ยังไม่มีประวัติการสุ่มตรวจในระบบ
            </div>
          ) : (
            <div className="space-y-3">
              {spotChecks.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">รอบ{s.round} ({s.scheduled_time} น.)</span>
                      <Badge variant={s.result_status === 'Pass' ? 'success' : s.result_status === 'Pending' ? 'warning' : 'destructive'}>
                        {s.result_status}
                      </Badge>
                    </div>
                    <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                      วันที่: {s.check_date}
                      {s.actual_scan_time && ` • สแกนเมื่อ ${new Date(s.actual_scan_time).toLocaleTimeString('th-TH')}`}
                    </p>
                  </div>

                  {s.photo_url && (
                    <a
                      href={s.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-orange-600 font-bold hover:underline border border-orange-200 bg-orange-50 px-3 py-1 rounded-lg"
                    >
                      ดูรูปสุ่มตรวจ ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SpotCheckModal
        spotCheck={activeCheck}
        onClose={() => setActiveCheck(null)}
        onSuccess={fetchSpotChecks}
      />
    </div>
  );
}
