'use client';

import { useState, useEffect } from 'react';
import CheckinModal from '@/components/CheckinModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, RefreshCw } from 'lucide-react';
import { CheckinLog, CheckinType } from '@/types';

export default function CheckinPage() {
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CheckinType>('เข้างาน');

  const fetchCheckinLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkin');
      if (res.ok) {
        const data = await res.json();
        setCheckinLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Fetch checkin logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckinLogs();
  }, []);

  const openCheckinModal = (type: CheckinType) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-orange-500" />
            <span>บันทึกเวลาปฏิบัติงาน (Check-in & GPS)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ลงเวลาเข้างาน/ออกงาน ตรวจสอบพิกัด GPS ออฟฟิศ และถ่ายภาพ Selfie ยืนยันตัวตน
          </p>
        </div>

        <Button onClick={fetchCheckinLogs} variant="outline" size="sm" disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชประวัติ</span>
        </Button>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              IN
            </div>
            <Badge variant="success">เข้างานประจำวัน</Badge>
          </div>
          <h3 className="font-bold text-slate-900 text-base">ลงเวลาเข้างาน</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">บันทึกเวลาปฏิบัติงานช่วงเช้าพร้อมพิกัด GPS</p>
          <Button onClick={() => openCheckinModal('เข้างาน')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            บันทึกเวลาเข้างาน
          </Button>
        </Card>

        <Card className="p-5 border-rose-200 bg-rose-50/40">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              OUT
            </div>
            <Badge variant="destructive">ออกงานประจำวัน</Badge>
          </div>
          <h3 className="font-bold text-slate-900 text-base">ลงเวลาออกงาน</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">บันทึกเวลาเลิกงานประจำวัน</p>
          <Button onClick={() => openCheckinModal('ออกงาน')} variant="destructive" className="w-full font-bold">
            บันทึกเวลาออกงาน
          </Button>
        </Card>

        <Card className="p-5 border-orange-200 bg-orange-50/40">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              ID
            </div>
            <Badge variant="default">ยืนยันตัวตน</Badge>
          </div>
          <h3 className="font-bold text-slate-900 text-base">ยืนยันพิกัดตำแหน่ง</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">บันทึกตำแหน่ง GPS ระหว่างวัน</p>
          <Button onClick={() => openCheckinModal('ยืนยันตัวตน')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold">
            บันทึกพิกัดตำแหน่ง
          </Button>
        </Card>
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span>ประวัติการลงเวลาวันนี้</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkinLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              ยังไม่มีประวัติการลงเวลาในวันนี้
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
                        {new Date(log.log_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
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
                      ดูรูปถ่าย ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CheckinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCheckinLogs}
        defaultType={selectedType}
      />
    </div>
  );
}
