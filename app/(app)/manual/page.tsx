'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  BookOpen, User, UserCheck, ShieldCheck, Search, CheckCircle2, 
  AlertTriangle, Clock, MapPin, Camera, BellRing, FileText, 
  Ticket, KeyRound, ArrowRight, ShieldAlert, Sparkles, ChevronRight, Info,
  Volume2, Moon, Globe, SlidersHorizontal, HelpCircle, Check, ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

export default function ManualPage() {
  const { t, lang } = useLanguage();
  const [userRole, setUserRole] = useState<'employee' | 'supervisor' | 'admin'>('employee');
  const [activeTab, setActiveTab] = useState<'employee' | 'supervisor' | 'admin'>('employee');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then((res) => res.json())
      .then((data) => {
        if (data.role) {
          const role = data.role as 'employee' | 'supervisor' | 'admin';
          setUserRole(role);
          setActiveTab(role === 'admin' ? 'admin' : role === 'supervisor' ? 'supervisor' : 'employee');
        }
      })
      .catch((err) => console.error('Fetch role error:', err))
      .finally(() => setLoading(false));
  }, []);

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500 shrink-0" />
            <span>{lang === 'en' ? 'User Manuals & System Documentation' : 'ศูนย์คู่มือการใช้งานระบบ (User Manuals)'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'en'
              ? 'Role-based SOP guidelines, attendance rules, spot-check protocols, and system administration'
              : 'คู่มือการปฏิบัติงาน WFH, กฎระเบียบการลงเวลา, การสุ่มตรวจยืนยันตัวตน, และการจัดการระบบตามบทบาท'}
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'en' ? 'Search manual topics...' : 'ค้นหาหัวข้อในคู่มือ...'}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Role Tabs (Filtered by Permissions) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-x-auto">
        {/* 1. Employee Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('employee')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'employee'
              ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{lang === 'en' ? 'Employee Guide' : 'คู่มือพนักงาน (Employee)'}</span>
        </button>

        {/* 2. Supervisor Tab */}
        {(userRole === 'supervisor' || userRole === 'admin') && (
          <button
            type="button"
            onClick={() => setActiveTab('supervisor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'supervisor'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{lang === 'en' ? 'Supervisor Guide' : 'คู่มือหัวหน้างาน (Supervisor)'}</span>
          </button>
        )}

        {/* 3. Admin Tab */}
        {userRole === 'admin' && (
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{lang === 'en' ? 'Administrator Guide' : 'คู่มือผู้ดูแลระบบ (Admin)'}</span>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 1. EMPLOYEE MANUAL TAB */}
      {/* ============================================================ */}
      {activeTab === 'employee' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border-orange-200/80 bg-gradient-to-r from-orange-50/50 to-white">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'en' ? 'General Employee Operations Manual' : 'คู่มือการปฏิบัติงานสำหรับพนักงานทั่วไป'}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {lang === 'en'
                    ? 'Work-From-Home standard procedures: Attendance check-in/out, Live selfie verification, Spot-checks, Daily work reporting, and Personal preferences.'
                    : 'ขั้นตอนการปฏิบัติงาน WFH: ลงเวลาเข้า-ออกงาน, ถ่ายภาพ Selfie สด, สุ่มตรวจยืนยันตัวตน 10 นาที, ส่งงานประจำวัน, และการปรับแต่งส่วนตัว'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 1: Check-in / Check-out */}
          {matchesSearch('ลงเวลา เข้างาน ออกงาน gps selfie พิกัด สาย') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      1. การลงเวลาเข้า-ออกงาน (Check-in / Check-out)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      เวลาเข้างานก่อน 08:00 น. และ เวลาออกงานหลัง 17:00 น.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <p className="font-bold text-slate-900">ขั้นตอนการลงเวลา:</p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>ไปที่เมนู <strong>"📍 ลงเวลาปฏิบัติงาน"</strong> แล้วกดปุ่ม <strong>"ลงเวลาเข้างาน"</strong> หรือ <strong>"ลงเวลาออกงาน"</strong></li>
                    <li>ระบบจะตรวจจับพิกัด <strong>GPS ละติจูด/ลองจิจูด</strong> อัตโนมัติ (กรุณากด Allow/อนุญาต ตำแหน่งบนบราวเซอร์)</li>
                    <li>ส่องกล้องใบหน้าให้อยู่ในกรอบ แล้วกดปุ่ม <strong>"📸 ถ่ายภาพ Selfie สด (Live Camera)"</strong> *(ระบบป้องกันการเลือกรูปเก่าเพื่อความโปร่งใส)*</li>
                    <li>หากลงเวลาเข้างานหลัง 08:00 น. (สาย) หรือออกก่อน 17:00 น. ระบบจะให้ระบุ <strong>"เหตุผลความจำเป็น"</strong></li>
                    <li>กดปุ่ม <strong>"💾 ยืนยันการลงเวลา"</strong> เพื่อบันทึกข้อมูลเข้าสู่ระบบทันที</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 2: Spot Check */}
          {matchesSearch('สุ่มตรวจ spot check 10 นาที เสียงเตือน ถ่ายรูป ระงับสิทธิ์') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      2. การยืนยันตัวตนสุ่มตรวจ (Spot Check 10 นาที)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      สุ่มตรวจระหว่างวัน ต้องสแกนใบหน้าภายใน 10 นาที
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-2">
                  <p className="font-bold text-rose-950">สิ่งที่ต้องทำเมื่อมีสัญญาณสุ่มตรวจ:</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-rose-900">
                    <li>เมื่อถึงรอบสุ่มตรวจ ระบบจะมีเสียงเตือน <strong>"ปิ๊ง-ป่อง! 🔔"</strong> พร้อมกล่องสีแดงนับถอยหลัง <strong>10:00 นาที</strong> เด้งขึ้นมาบนหน้าจอ</li>
                    <li>ให้กดปุ่ม <strong>"📸 เปิดกล้องสแกน ↗"</strong> ทันที</li>
                    <li>ส่องกล้องถ่ายภาพ Selfie สดและกด <strong>"💾 ยืนยันผลการสุ่มตรวจ"</strong></li>
                  </ul>
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                    ⚠️ กฎระเบียบ WFH: หากไม่สแกนภายใน 10 นาที ระบบจะบันทึกสถานะเป็น <strong>"ไม่ผ่าน (ขาดการติดต่อ)"</strong> หากสะสมครบ 3 ครั้ง สิทธิ์การทำงาน WFH จะถูกระงับอัตโนมัติ
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: Daily Tasks */}
          {matchesSearch('ส่งงาน ผลงาน ประจำวัน daily tasks คะแนน ดาว 1 ดาว') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      3. การส่งรายงานผลงานประจำวัน (Daily Tasks)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      บันทึกผลงานประจำวันเพื่อให้หัวหน้างานประเมินคะแนนดาว
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>ไปที่เมนู <strong>"📄 ส่งงานประจำวัน"</strong> ➔ กดปุ่ม <strong>"+ ส่งรายงานประจำวัน"</strong></li>
                    <li>กรอกจำนวนงานที่ได้รับมอบหมาย, งานที่สำเร็จ, และสรุปรายละเอียดเนื้องานที่ทำในวันนี้</li>
                    <li>แนบลิงก์ผลงาน (เช่น Google Drive, Figma, GitHub, เอกสารงาน) เพื่อให้หัวหน้างานตรวจชิ้นงานจริง</li>
                    <li>สามารถกด <strong>"✏️ แก้ไขรายงานวันนี้"</strong> เพื่อเพิ่มเติมรายละเอียดงานได้ตลอดวัน</li>
                  </ol>
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] font-medium">
                    ⭐ กฎการประเมิน: หัวหน้างานจะประเมินคะแนน 1 - 5 ดาว หากพนักงานได้ <strong>1 ดาวสะสมครบ 3 ครั้ง</strong> สิทธิ์ WFH จะถูกระงับอัตโนมัติ
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Support Tickets */}
          {matchesSearch('แจ้งปัญหา it ticket helpdesk แอดมิน') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      4. การแจ้งปัญหา IT และขอความช่วยเหลือ (Support Ticket)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      เปิดตั๋วแจ้งปัญหาการใช้งานเพื่อประสานงานกับผู้ดูแลระบบ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <ul className="list-disc list-inside space-y-1.5 pl-1">
                    <li>กดปุ่ม <strong>"🎫 แจ้งปัญหา IT"</strong> ที่มุมขวาบนของหน้าจอ</li>
                    <li>เลือกหมวดหมู่ปัญหา (เช่น ปัญหา GPS, กล้องถ่ายภาพ, สิทธิ์การใช้งาน) และพิมพ์รายละเอียด</li>
                    <li>ตรวจสอบสถานะตั๋วและอ่านข้อความตอบกลับจากแอดมินได้ในแท็บ <strong>"ประวัติการแจ้งปัญหาของฉัน"</strong></li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 5: Preferences */}
          {matchesSearch('ธีมมืด dark mode เสียง ภาษา pin เปลี่ยนรหัส') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      5. การตั้งค่าและการปรับแต่งส่วนตัว (Preferences)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      โหมดมืด/สว่าง, เสียงแจ้งเตือน, ภาษา, และรหัส PIN
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-amber-500" /> โหมดมืด / สว่าง (Dark Mode)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">คลิกปุ่มไอคอน ☀️/🌙 ที่มุมขวาบน เพื่อสลับธีม Warm Midnight สบายตา ไม่แสบตา</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> เสียงแจ้งเตือน (Sound Alert)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">คลิกปุ่ม 🔊 เพื่อเปิด-ปิดเสียงเตือนสุ่มตรวจและเตือนรอบ 13:00 น. ได้ตามต้องการ</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" /> สลับภาษา (TH / EN)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">คลิกปุ่ม [ TH | EN ] เพื่อเปลี่ยนเมนูและข้อความทั้งหมดเป็นภาษาไทยหรืออังกฤษ</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-orange-500" /> เปลี่ยนรหัส PIN
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">คลิกเมนู <strong>"🔑 เปลี่ยนรหัส PIN"</strong> ที่แถบเมนูด้านซ้ายล่างเพื่อตั้งรหัสใหม่ 4 หลัก</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SUPERVISOR MANUAL TAB */}
      {/* ============================================================ */}
      {activeTab === 'supervisor' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/50 to-white">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'en' ? 'Supervisor Operations Manual' : 'คู่มือการปฏิบัติงานสำหรับหัวหน้างาน (Supervisor)'}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {lang === 'en'
                    ? 'Monitoring subordinate attendance, Reviewing live selfie photos in Lightbox, Evaluating daily tasks, and Triggering on-demand spot-checks.'
                    : 'การติดตามเวลาเข้างานของลูกทีม, ตรวจสอบภาพถ่าย Selfie ขยายใหญ่, ประเมินดาวผลงาน, และสั่งสุ่มตรวจเจาะจงบุคคล'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 1: Dashboard Overview */}
          {matchesSearch('สถานะ ลูกทีม ตรงเวลา สาย ยังไม่ลงเวลา แดชบอร์ด') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  1. การติดตามสถานะลูกทีมรายวัน (Team Metrics Dashboard)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <p className="font-bold text-emerald-800">เข้างานตรงเวลา</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">ลงเวลาก่อน 08:00 น.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <p className="font-bold text-amber-800">เข้างานสาย</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">มีเหตุผลความจำเป็น</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                    <p className="font-bold text-rose-800">ยังไม่ลงเวลา</p>
                    <p className="text-[11px] text-rose-600 mt-0.5">ขาดการลงเวลาเข้างาน</p>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
                    <p className="font-bold text-orange-800">เฉลี่ยดาวของทีม</p>
                    <p className="text-[11px] text-orange-600 mt-0.5">คะแนนประเมินผลงาน</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 2: Search & Filter */}
          {matchesSearch('ค้นหา กรอง แผนก quick search department filter') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  2. ช่องค้นหาด่วน & ตัวกรองแผนก (Quick Search & Filters)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p>• <strong>ช่องค้นหาด่วน:</strong> พิมพ์ชื่อหรือรหัสพนักงานเพื่อกรองรายชื่อและประวัติได้ทันทีแบบ Real-time</p>
                  <p>• <strong>Dropdown ตัวกรองแผนก:</strong> เลือกกรองดูเฉพาะแผนกที่ต้องการ เช่น แผนกไอที, แผนกบัญชี, แผนกจัดซื้อ</p>
                  <p>• <strong>ปุ่มตัวกรองวันที่:</strong> เลือกดูเฉพาะ วันนี้, ทั้งหมด, หรือระบุวันที่ย้อนหลัง</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: Lightbox & Selfie Inspection */}
          {matchesSearch('lightbox selfie รูปถ่าย ดูรูป ขยาย google maps พิกัด') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  3. การตรวจภาพถ่าย Selfie และพิกัด GPS (Selfie Lightbox Modal)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p>• ในตารางประวัติเวลาเข้างานและสุ่มตรวจ จะมีปุ่มสีเขียว <strong>`[ 📷 ดูรูปถ่าย Selfie ]`</strong></p>
                  <p>• เมื่อคลิก จะเปิดหน้าต่าง <strong>Lightbox Modal</strong> แสดงรูปถ่ายเซลฟี่ขนาดใหญ่ คมชัด</p>
                  <p>• มีปุ่ม <strong>"📍 เปิดพิกัด Google Maps"</strong> เพื่อเปิดแผนที่ตรวจสอบตำแหน่งที่พนักงานกำลังปฏิบัติงานได้ทันที</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Evaluating Tasks */}
          {matchesSearch('ประเมินดาว ตรวจงาน ให้คะแนน ลิงก์') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  4. การตรวจชิ้นงานและประเมินคะแนนดาว (Task Evaluation)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>ในแท็บ <strong>"ประเมินรายงานส่งงาน"</strong> คลิก <strong>"🔗 เปิดลิงก์ส่งงาน ↗"</strong> เพื่อตรวจดูชิ้นงานจริงของลูกทีม</li>
                    <li>กดปุ่ม <strong>"⭐ ประเมินผลงาน"</strong> ➔ เลือกระดับดาว 1 - 5 ดาว และพิมพ์คำแนะนำ/ข้อเสนอแนะ</li>
                    <li>กดบันทึก ➔ ระบบจะส่งผลการประเมินพร้อมการแจ้งเตือนไปยังพนักงานทันที</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 5: On-Demand Spot Check */}
          {matchesSearch('สุ่มตรวจทันที on demand เฉพาะกิจ') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  5. การส่งคำสั่งสุ่มตรวจเจาะจงบุคคล (On-Demand Spot Check)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                  <p className="font-bold text-amber-950">ขั้นตอนการสุ่มตรวจ:</p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-amber-900">
                    <li>ในแท็บ <strong>"จัดการลูกทีม & สั่งสุ่มตรวจเฉพาะกิจ"</strong> กดปุ่ม <strong>"🔔 สุ่มตรวจทันที"</strong> ที่แถวของพนักงานที่ต้องการตรวจ</li>
                    <li>พิมพ์ระบุหมายเหตุและกดยืนยัน ➔ หน้าจอลูกทีมจะมีเสียงเตือนและกล่องนับถอยหลัง 10 นาทีทันที</li>
                    <li>ลูกทีมต้องเปิดกล้องถ่ายภาพ Selfie สดส่งกลับมาภายใน 10 นาที</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ADMIN MANUAL TAB */}
      {/* ============================================================ */}
      {activeTab === 'admin' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border-blue-200/80 bg-gradient-to-r from-blue-50/50 to-white">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'en' ? 'System Administrator Manual' : 'คู่มือการปฏิบัติงานสำหรับผู้ดูแลระบบ (Admin)'}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {lang === 'en'
                    ? 'Employee management, Unlocking WFH status, Resetting PINs, Photo exemption gate, System logs pagination, Helpdesk tickets, and Office GPS settings.'
                    : 'การจัดการพนักงาน, ปลดระงับสิทธิ์ WFH, รีเซ็ต PIN, ตั้งค่ายกเว้นถ่ายรูป Selfie, ตรวจ Log ทั้งระบบ, จัดการตั๋ว IT, และตั้งค่าพิกัดออฟฟิศ'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 1: Employee Management */}
          {matchesSearch('จัดการพนักงาน เพิ่มพนักงาน ปลดระงับสิทธิ์ รีเซ็ต pin 1234 ล้าง 1 ดาว') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  1. การจัดการพนักงานและสิทธิ์ WFH (Tab 1: พนักงาน)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-bold text-slate-900">+ เพิ่มพนักงานใหม่</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">กรอกรหัส, ชื่อ, แผนก, ตำแหน่ง, และบทบาท (รหัส PIN เริ่มต้นคือ 1234)</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-bold text-slate-900">🔓 ปลดระงับสิทธิ์ WFH</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">กดสลับสถานะจาก "ระงับสิทธิ์ (สีแดง)" กลับเป็น "เปิดสิทธิ์ (สีเขียว)" เพื่อให้พนักงานกลับมาลงเวลาได้</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-bold text-slate-900">🔑 รีเซ็ต PIN</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">รีเซ็ตรหัส PIN ของพนักงานกลับเป็น 1234 เมื่อพนักงานลืมรหัสผ่าน</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-bold text-slate-900">⭐ ล้างประวัติ 1 ดาว</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">ล้างประวัติการสะสม 1 ดาวกลับเป็น 0 ครั้งเมื่อได้รับการอนุมัติผ่อนผัน</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 2: Photo Exemption Gate */}
          {matchesSearch('ยกเว้น ถ่ายรูป selfie photo exempt ตำแหน่ง') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  2. การตั้งค่าขอยกเว้นการถ่ายรูป Selfie ตามตำแหน่ง (Photo Exemption Gate)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p>• ในตารางรายชื่อพนักงาน มีคอลัมน์ <strong>"ยกเว้นถ่ายรูปเซลฟี่"</strong></p>
                  <p>• แอดมินสามารถกดคลิกสลับปุ่ม <strong>[ บังคับถ่ายรูป 📷 ]</strong> หรือ <strong>[ ยกเว้นถ่ายรูป 🛡️ ]</strong> สำหรับตำแหน่งระดับหัวหน้า/ผู้บริหาร</p>
                  <p>• การตั้งค่าจะถูกบันทึกลงในฐานข้อมูลระบบทันทีแบบ Real-time</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: System Logs & Pagination */}
          {matchesSearch('log pagination แบ่งหน้า ประวัติ ตรวจสอบ') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  3. การตรวจ Log ระบบและระบบแบ่งหน้า (Tab 2: Log ระบบ)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p>• <strong>ค้นหาด่วน & ตัวกรอง:</strong> ค้นหาตามชื่อ, รหัสพนักงาน, แผนก, หรือประเภท Log ได้ทันที</p>
                  <p>• <strong>ระบบแบ่งหน้า (Pagination):</strong> เลือกระดับการแสดงผลได้ 10, 20, 50, 100 แถวต่อหน้า เพื่อความรวดเร็วในการโหลด</p>
                  <p>• <strong>Lightbox & GPS:</strong> คลิกที่รูปภาพเพื่อขยายภาพ Selfie และคลิกปุ่มพิกัดเพื่อเปิด Google Maps</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4: IT Helpdesk */}
          {matchesSearch('ตั๋ว ปัญหา it helpdesk ตอบกลับ ปิดตั๋ว') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  4. การตอบรับและปิดตั๋วแจ้งปัญหา IT (Tab 3: แจ้งปัญหา IT)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p>1. เมื่อมีตั๋วใหม่ ระบบจะมีเสียงเตือน <strong>"ติ๊ง-ด่อง! 🎫"</strong></p>
                  <p>2. กดปุ่ม <strong>"✏️ ตรวจสอบ & ปิดตั๋ว"</strong> เพื่ออ่านรายละเอียดปัญหา</p>
                  <p>3. พิมพ์ <strong>ข้อความตอบกลับจากแอดมิน</strong> และกดบันทึกปิดตั๋ว ➔ ระบบจะส่งข้อความแจ้งเตือนกลับไปหาพนักงานทันที</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 5: Office GPS Config */}
          {matchesSearch('พิกัด ออฟฟิศ รัศมี geofence ตั้งค่า config') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                  5. การตั้งค่าพิกัดออฟฟิศและระบบสุ่มตรวจ (Tab 4: ตั้งค่าระบบ)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p>• <strong>พิกัดออฟฟิศ (Office GPS):</strong> ตั้งค่าละติจูดและลองจิจูดของสำนักงาน เพื่อให้ระบบคำนวณระยะทางว่าพนักงาน WFH หรือเข้าออฟฟิศ</p>
                  <p>• <strong>รัศมี Geofence:</strong> กำหนดระยะปลอดภัยรอบออฟฟิศ (เมตร)</p>
                  <p>• <strong>เวลาสุ่มตรวจ:</strong> กำหนดช่วงเวลาการสุ่มตรวจอัตโนมัติรอบเช้าและรอบบ่าย</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
