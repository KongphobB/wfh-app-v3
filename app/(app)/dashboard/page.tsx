'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, Clock, MapPin, AlertTriangle, FileText, 
  HelpCircle, Star, RefreshCw, ChevronRight, ShieldCheck, BellRing
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckinLog, TaskItem, SpotCheck } from '@/types';

export default function DashboardPage() {
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [spotChecks, setSpotChecks] = useState<SpotCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpotCheck, setActiveSpotCheck] = useState<SpotCheck | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, tRes, sRes] = await Promise.all([
        fetch('/api/checkin'),
        fetch('/api/tasks'),
        fetch('/api/spotcheck'),
      ]);

      if (cRes.ok) setCheckinLogs((await cRes.json()).logs || []);
      if (tRes.ok) setTasks((await tRes.json()).tasks || []);
      if (sRes.ok) {
        const sData = await sRes.json();
        const pending = (sData.spotChecks || []).find((s: SpotCheck) => s.result_status === 'Pending');
        setActiveSpotCheck(pending || null);
        setSpotChecks(sData.spotChecks || []);
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const todayCheckin = checkinLogs.find((l) => l.log_type === 'เข้างาน');
  const todayCheckout = checkinLogs.find((l) => l.log_type === 'ออกงาน');

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>ภาพรวมการทำงาน WFH</span>
            <Badge variant="success">เปิดสิทธิ์ WFH</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">สรุปการลงเวลาเข้า-ออกงาน กิจกรรมสุ่มตรวจ และสถานะส่งงานประจำวัน</p>
        </div>

        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชข้อมูล</span>
        </Button>
      </div>

      {/* Pending Spot Check Alert Banner */}
      {activeSpotCheck && (
        <Card className="border-orange-200 bg-orange-50/80">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 animate-bounce font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">มีรายการสุ่มตรวจยืนยันตัวตน (Spot Check)</h3>
                <p className="text-xs text-orange-700 font-medium">รอบ{activeSpotCheck.round} ({activeSpotCheck.scheduled_time} น.) — กรุณาสแกนถ่ายรูปยืนยันตัวตน</p>
              </div>
            </div>
            <Link href="/spotcheck">
              <Button variant="default" className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-1 text-xs">
                <span>เข้าสู่หน้าสุ่มตรวจ</span>
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
            <CardDescription className="text-emerald-700 font-bold">เวลาเข้างานวันนี้</CardDescription>
            <CardTitle className="text-xl text-slate-900">
              {todayCheckin
                ? new Date(todayCheckin.log_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
                : 'ยังไม่ลงเวลา'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 font-medium">
              {todayCheckin ? `สถานะ: ${todayCheckin.verification_status}` : 'กดลงเวลาที่หน้าเช็คอิน'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-200/80 bg-rose-50/30">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-rose-700 font-bold">เวลาออกงานวันนี้</CardDescription>
            <CardTitle className="text-xl text-slate-900">
              {todayCheckout
                ? new Date(todayCheckout.log_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
                : 'ยังไม่ลงเวลา'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 font-medium">
              {todayCheckout ? `สถานะ: ${todayCheckout.verification_status}` : 'กดออกงานหลังเลิกงาน'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200/80 bg-orange-50/30">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-orange-700 font-bold">รายงานส่งงานวันนี้</CardDescription>
            <CardTitle className="text-xl text-slate-900">
              {tasks.length > 0 ? `${tasks.length} รายการ` : 'ยังไม่ส่งงาน'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 font-medium">
              ส่งงานประจำวันให้หัวหน้าประเมิน
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/checkin" className="block group">
          <Card className="p-4 hover:border-emerald-300 transition-all group-hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">ลงเวลาปฏิบัติงาน</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">เข้างาน / ออกงาน / GPS</p>
          </Card>
        </Link>

        <Link href="/spotcheck" className="block group">
          <Card className="p-4 hover:border-orange-300 transition-all group-hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 font-bold">
              <BellRing className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">สุ่มตรวจยืนยันตัวตน</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Spot Check ยืนยันพิกัด</p>
          </Card>
        </Link>

        <Link href="/tasks" className="block group">
          <Card className="p-4 hover:border-orange-300 transition-all group-hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">ส่งงานประจำวัน</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">รายงานผลงานให้หัวหน้า</p>
          </Card>
        </Link>

        <Link href="/supervisor" className="block group">
          <Card className="p-4 hover:border-emerald-300 transition-all group-hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">แผงประเมินงาน</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">สำหรับหัวหน้างาน</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
