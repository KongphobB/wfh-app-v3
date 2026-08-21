'use client';

import { useState, useEffect } from 'react';
import CheckinModal from '@/components/CheckinModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { CheckinLog, CheckinType } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function CheckinPage() {
  const { t, lang } = useLanguage();
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CheckinType>('เข้างาน');
  const [alertPopup, setAlertPopup] = useState<{ title: string; message: string } | null>(null);

  const fetchCheckinLogs = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/checkin');
      if (res.ok) {
        const data = await res.json();
        setCheckinLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Fetch checkin logs error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckinLogs(true);

    const interval = setInterval(() => {
      fetchCheckinLogs(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const openCheckinModal = (type: CheckinType) => {
    if (type === 'ยืนยันตัวตน') {
      let currentHour = 0;
      try {
        const thaiTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok', hour12: false });
        currentHour = parseInt(thaiTimeStr.split(':')[0], 10);
      } catch {
        currentHour = new Date().getHours();
      }
      if (currentHour < 13) {
        setAlertPopup({
          title: lang === 'en' ? 'Afternoon Window Not Open Yet' : 'ยังไม่ถึงเวลายืนยันตัวตน',
          message: lang === 'en' ? 'The afternoon verification window opens at 13:00 - 13:20 PM.' : 'รอบการยืนยันตัวตนช่วงบ่ายจะเปิดให้ลงเวลาตั้งแต่เวลา 13:00 - 13:20 น. ครับ',
        });
        return;
      }
    }
    setSelectedType(type);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-orange-500" />
            <span>{t.checkin.pageTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t.checkin.pageSubtitle}
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              IN
            </div>
            <Badge variant="success">{t.checkin.morningCheckin}</Badge>
          </div>
          <h3 className="font-bold text-slate-900 text-base">{t.checkin.morningCheckin}</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">{t.checkin.morningTimeHint}</p>
          <Button onClick={() => openCheckinModal('เข้างาน')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">
            {t.checkin.morningCheckin}
          </Button>
        </Card>

        <Card className="p-5 border-rose-200 bg-rose-50/40">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              OUT
            </div>
            <Badge variant="destructive">{t.checkin.eveningCheckout}</Badge>
          </div>
          <h3 className="font-bold text-slate-900 text-base">{t.checkin.eveningCheckout}</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">{t.checkin.eveningTimeHint}</p>
          <Button onClick={() => openCheckinModal('ออกงาน')} variant="destructive" className="w-full font-bold cursor-pointer">
            {t.checkin.eveningCheckout}
          </Button>
        </Card>

        <Card className="p-5 border-orange-200 bg-orange-50/40">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              ID
            </div>
            <Badge variant="default">{t.checkin.afternoonVerify}</Badge>
          </div>
          <h3 className="font-bold text-slate-900 text-base">{t.checkin.afternoonVerify}</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">{t.checkin.afternoonTimeHint}</p>
          <Button onClick={() => openCheckinModal('ยืนยันตัวตน')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold cursor-pointer">
            {t.checkin.afternoonVerify}
          </Button>
        </Card>
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span>{t.checkin.historyTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkinLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              {t.common.noData}
            </div>
          ) : (
            <div className="space-y-3">
              {checkinLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      log.log_type === 'เข้างาน'
                        ? 'bg-emerald-100 text-emerald-700'
                        : log.log_type === 'ออกงาน'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {log.log_type === 'เข้างาน' ? 'IN' : log.log_type === 'ออกงาน' ? 'OUT' : 'ID'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{log.log_type}</span>
                        <Badge variant={log.verification_status === 'ปฏิบัติงานที่ออฟฟิศ' ? 'success' : 'default'}>
                          {log.verification_status}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                        {new Date(log.log_time).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', { hour: '2-digit', minute: '2-digit' }) + (lang === 'en' ? '' : ' น.')}
                        {log.note && ` • ${log.note}`}
                      </p>
                    </div>
                  </div>

                  {log.photo_url && (
                    <a
                      href={log.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-orange-600 font-bold hover:underline border border-orange-200 bg-orange-50 px-3 py-1 rounded-lg"
                    >
                      {lang === 'en' ? 'View Photo ↗' : 'ดูรูปถ่าย ↗'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popup Alert Dialog Modal */}
      {alertPopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="glass-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-orange-200 bg-white text-center relative animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto mb-4 font-bold shadow-inner">
              <AlertCircle className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{alertPopup.title}</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6 px-1">
              {alertPopup.message}
            </p>
            <Button
              type="button"
              onClick={() => setAlertPopup(null)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-2.5 shadow-md shadow-orange-500/20"
            >
              {t.common.confirm}
            </Button>
          </div>
        </div>
      )}

      <CheckinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCheckinLogs}
        defaultType={selectedType}
      />
    </div>
  );
}
