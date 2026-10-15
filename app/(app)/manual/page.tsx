'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, User, UserCheck, ShieldCheck, Search, X,
  Clock, MapPin, Camera, BellRing, FileText, 
  Ticket, KeyRound,
  Volume2, Moon, Globe, SlidersHorizontal, Check, Calendar, TrendingUp, MessageSquare, MessageSquarePlus,
  Palmtree, History
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';

const employeeSearchKeys = [
  'ลงเวลา เข้างาน ออกงาน gps selfie พิกัด สาย',
  'สุ่มตรวจ spot check 10 นาที เสียงเตือน ถ่ายรูป ระงับสิทธิ์',
  'ส่งงาน ผลงาน ประจำวัน daily tasks คะแนน ดาว 1 ดาว',
  'แจ้งปัญหา it ticket helpdesk แอดมิน',
  'ธีมมืด dark mode เสียง ภาษา pin เปลี่ยนรหัส',
  'ลา ขอลา ลาป่วย ลากิจ พักร้อน ออฟฟิศ onsite leave ยกเว้น แจ้งเตือน',
  'สถิติ ประสิทธิภาพ analytics กราฟ ดาว คะแนน ตรงเวลา on-time rate',
  'ข้อเสนอแนะ suggestion anonymous ไม่ระบุตัวตน พักเที่ยง lunch break 12:00 13:00',
  'วันหยุด ปฏิทิน holidays นักขัตฤกษ์ ประกาศบริษัท แนบไฟล์ ดาวน์โหลด'
];

const supervisorSearchKeys = [
  'สถานะ ลูกทีม ตรงเวลา สาย ยังไม่ลงเวลา แดชบอร์ด',
  'ค้นหา กรอง แผนก quick search department filter',
  'lightbox selfie รูปถ่าย ดูรูป ขยาย google maps พิกัด',
  'ประเมินดาว ตรวจงาน ให้คะแนน ลิงก์',
  'สุ่มตรวจทันที on demand เฉพาะกิจ',
  'อนุมัติ ลา ลาป่วย ลากิจ พักร้อน ออฟฟิศ leave approve supervisor',
  'สถิติทิม analytics กราฟ ประสิทธิภาพ ดาว ตรงเวลา team metrics',
  'แจ้งเตือน อีเมล กระดิ่ง สาย ขาดงาน สุ่มตรวจ supervisor notifications email'
];

const adminSearchKeys = [
  'จัดการพนักงาน เพิ่มพนักงาน ปลดระงับสิทธิ์ รีเซ็ต pin 1234 ล้าง 1 ดาว',
  'ยกเว้น ถ่ายรูป selfie photo exempt ตำแหน่ง',
  'log pagination แบ่งหน้า ประวัติ ตรวจสอบ',
  'ตั๋ว ปัญหา it helpdesk ตอบกลับ ปิดตั๋ว',
  'พิกัด ออฟฟิศ รัศมี geofence ตั้งค่า config',
  'แจ้งเตือน ขาดลงเวลา 08:00 ขาดงาน 12:00 สาย สุ่มตรวจ อีเมล alert dual email cron',
  'ข้อเสนอแนะ suggestion ความคิดเห็น anonymous กล่อง admin desk',
  'จัดการวันหยุด holiday policy แนบไฟล์ ประกาศบริษัท pdf upload admin desk',
  'ประวัติ audit trail log ตรวจสอบ แอดมิน ปลดสิทธิ์ แก้ไข พิกัด ผู้ดูแลระบบ'
];

export default function ManualPage() {
  const { t, lang } = useLanguage();
  const [userRole, setUserRole] = useState<'employee' | 'supervisor' | 'admin'>('employee');
  const [activeTab, setActiveTab] = useState<'employee' | 'supervisor' | 'admin'>('employee');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialTab: 'employee' | 'supervisor' | 'admin' | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'employee' || tabParam === 'supervisor' || tabParam === 'admin') {
        initialTab = tabParam;
      }
    } catch {}

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.role) {
          const role = data.role as 'employee' | 'supervisor' | 'admin';
          setUserRole(role);
          if (
            initialTab &&
            (initialTab === 'employee' ||
              (initialTab === 'supervisor' && (role === 'supervisor' || role === 'admin')) ||
              (initialTab === 'admin' && role === 'admin'))
          ) {
            setActiveTab(initialTab);
          } else {
            setActiveTab(role === 'admin' ? 'admin' : role === 'supervisor' ? 'supervisor' : 'employee');
          }
        }
      })
      .catch((err) => console.error('Fetch role error:', err))
      .finally(() => setLoading(false));
  }, []);

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  const hasMatches = (tab: 'employee' | 'supervisor' | 'admin') => {
    if (!searchQuery.trim()) return true;
    const list =
      tab === 'employee'
        ? employeeSearchKeys
        : tab === 'supervisor'
        ? supervisorSearchKeys
        : adminSearchKeys;
    return list.some((k) => matchesSearch(k));
  };

  const renderEmptyState = () => (
    <Card className="border-dashed border-slate-200 dark:border-slate-800 text-center py-10 px-4 bg-white/50 dark:bg-slate-900/50">
      <CardContent className="space-y-3 flex flex-col items-center justify-center p-0">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {lang === 'en' ? 'No matching manual topics found' : 'ไม่พบหัวข้อคู่มือที่ตรงกับคำค้นหา'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'en'
              ? `No topics found matching "${searchQuery}" in this guide.`
              : `ไม่พบเนื้อหาที่ตรงกับ "${searchQuery}" ในหมวดหมู่นี้`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          {lang === 'en' ? 'Clear Search' : 'ล้างคำค้นหา'}
        </button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500 shrink-0" />
            <span>{lang === 'en' ? 'User Manuals & System Documentation' : 'ศูนย์คู่มือการใช้งานระบบ (User Manuals)'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title={lang === 'en' ? 'Clear search' : 'ล้างคำค้นหา'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Role Tabs (Filtered by Permissions) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
        {/* 1. Employee Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('employee')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'employee'
              ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
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
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
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
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
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
          <Card className="border-orange-200/80 dark:border-orange-900/60 bg-gradient-to-r from-orange-50/50 dark:from-orange-950/20 to-white dark:to-slate-900">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'en' ? 'General Employee Operations Manual' : 'คู่มือการปฏิบัติงานสำหรับพนักงานทั่วไป'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
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
                      1. การลงเวลาเข้า-ออกงาน และกติกาการปฏิบัติงาน (Check-in / Check-out SOP)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      เวลาเข้างานก่อน 08:00 น., รอบยืนยันตัวตน 13:00 - 13:20 น., และเวลาออกงานหลัง 17:00 น.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <p className="font-bold text-slate-900">ขั้นตอนการลงเวลา:</p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>ไปที่เมนู <strong>"📍 ลงเวลาปฏิบัติงาน"</strong> แล้วกดปุ่ม <strong>"ลงเวลาเข้างาน"</strong> หรือ <strong>"ลงเวลาออกงาน"</strong></li>
                    <li>ระบบจะตรวจจับพิกัด <strong>GPS ละติจูด/ลองจิจูด</strong> อัตโนมัติ (กรุณากด Allow/อนุญาต ตำแหน่งบนบราวเซอร์)</li>
                    <li>ส่องกล้องใบหน้าให้อยู่ในกรอบ แล้วกดปุ่ม <strong>"📸 ถ่ายภาพ Selfie สด (Live Camera)"</strong> *(ระบบป้องกันการเลือกรูปเก่าเพื่อความโปร่งใส)*</li>
                    <li>หากลงเวลาเข้างานหลัง 08:00 น. (สาย) หรือออกก่อน 17:00 น. ระบบจะให้ระบุ <strong>"เหตุผลความจำเป็น"</strong> ซึ่งระบบจะส่งอีเมลแจ้งเตือนพร้อมเหตุผลไปยังหัวหน้างานและ Admin ทันที</li>
                    <li>กดปุ่ม <strong>"💾 ยืนยันการลงเวลา"</strong> เพื่อบันทึกข้อมูลเข้าสู่ระบบทันที</li>
                  </ol>

                  {/* Highlights of Business Rules */}
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                    <p className="font-bold text-slate-900">กฎระเบียบและความปลอดภัยในการลงเวลา:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1">
                        <p className="font-bold flex items-center gap-1 text-emerald-800">
                          <span>🟢 ป้องกันการเข้างานซ้ำ (Double Check-in Guard)</span>
                        </p>
                        <p className="text-emerald-900">
                          ลงเวลาเข้างานได้เพียง <strong>วันละ 1 ครั้ง</strong> เมื่อลงเวลาสำเร็จแล้ว ปุ่มจะแสดงสถานะ <em>"✓ เข้างานเรียบร้อยแล้ว"</em> พร้อมระบุเวลา และปิดการกดซ้ำอัตโนมัติ
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-950 space-y-1">
                        <p className="font-bold flex items-center gap-1 text-rose-800">
                          <span>🔴 ต้องเข้างานก่อนจึงจะออกงานได้ (Prerequisite Guard)</span>
                        </p>
                        <p className="text-rose-900">
                          ระบบไม่อนุญาตให้กด <em>"ออกงาน"</em> หากยังไม่มีประวัติการเข้างานของวันนั้น และสามารถลงเวลาออกงานได้เพียง <strong>วันละ 1 ครั้ง</strong> เท่านั้น
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-200 text-orange-950 space-y-1">
                        <p className="font-bold flex items-center gap-1 text-orange-800">
                          <span>🟠 รอบยืนยันตัวตนช่วงบ่าย (13:00 - 13:20 น.)</span>
                        </p>
                        <p className="text-orange-900">
                          เปิดให้ยืนยันตัวตนเฉพาะช่วงเวลา 13:00 - 13:20 น. (หากยืนยันหลัง 13:20 น. ต้องระบุเหตุผล) เพื่อยืนยันการพร้อมปฏิบัติงานตลอดช่วงบ่าย
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 space-y-1">
                        <p className="font-bold flex items-center gap-1 text-blue-800">
                          <span>🔵 สลับสถานะ Office/WFH อัตโนมัติ (Geofence)</span>
                        </p>
                        <p className="text-blue-900">
                          หากเช็คอินนอกรัศมีบริษัท (เกิน 200 ม.) ระบบจะปรับสถานะเป็น WFH ให้อัตโนมัติ พร้อมแจ้งเตือนหัวหน้างาน และเปิดรับการสุ่มตรวจประจำวัน
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Security Highlights */}
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300/80 text-slate-800 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1 text-slate-900">
                      <span>🔒 การรักษาความปลอดภัยและความเป็นส่วนตัว (Privacy & Security):</span>
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      <li><strong>รูปถ่ายเซลฟี่:</strong> พนักงานดูได้เฉพาะรูปของตนเองเท่านั้น หัวหน้างานดูได้เฉพาะรูปของลูกทีม และแอดมินดูได้เพื่อการตรวจสอบ</li>
                      <li><strong>ระบบป้องกัน PIN:</strong> หากกรอกรหัส PIN ผิดติดต่อกัน 5 ครั้ง บัญชีจะถูกระงับชั่วคราวเป็นเวลา 15 นาที เพื่อป้องกันการสุ่มรหัสผ่าน</li>
                    </ul>
                  </div>
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
                  <p className="font-bold text-rose-950">สิ่งที่ต้องทำเมื่อมีสัญญาณสุ่มตรวจ (รอบเช้า 09:00 - 11:00 น. และ รอบบ่าย 14:00 - 16:00 น.):</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-rose-900">
                    <li>เมื่อถึงรอบสุ่มตรวจ ระบบจะมีเสียงเตือน <strong>"ปิ๊ง-ป่อง! 🔔"</strong> พร้อมกล่องสีแดงนับถอยหลัง <strong>10:00 นาที</strong> เด้งขึ้นมาบนหน้าจอ</li>
                    <li>ให้กดปุ่ม <strong>"📸 เปิดกล้องสแกน ↗"</strong> ทันที</li>
                    <li>ส่องกล้องถ่ายภาพ Selfie สดและกด <strong>"💾 ยืนยันผลการสุ่มตรวจ"</strong></li>
                  </ul>
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                    ⚠️ กฎระเบียบ WFH: หากไม่สแกนภายใน 10 นาที ระบบจะบันทึกสถานะเป็น <strong>"ไม่ผ่าน (ขาดการติดต่อ)"</strong> และส่งอีเมลแจ้งเตือนด่วนไปยังหัวหน้างานและ Admin ทันที หากสะสมครบ 3 ครั้ง สิทธิ์การทำงาน WFH จะถูกระงับอัตโนมัติ
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

          {/* Section 6: Leave & Schedule Exemption */}
          {matchesSearch('ลา ขอลา ลาป่วย ลากิจ พักร้อน ออฟฟิศ onsite leave ยกเว้น แจ้งเตือน') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      6. การขอลาหยุดและการสลับเข้าออฟฟิศ (Leave & Schedule Exemption)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ยื่นคำขอลาป่วย ลากิจ ลาพักร้อน หรือสลับเข้าออฟฟิศเพื่อยกเว้นการแจ้งเตือนขาดงานอัตโนมัติ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                  <p className="font-bold text-blue-950">ขั้นตอนการยื่นคำขอลา:</p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-blue-950">
                    <li>ไปที่เมนู <strong>"📅 ขอลาหยุด / สลับวัน"</strong> และกดปุ่ม <strong>"+ ยื่นคำขอลา / สลับวัน"</strong></li>
                    <li>เลือกประเภทการลา (ลาป่วย, ลากิจ, ลาพักร้อน, หรือ ปฏิบัติงานที่ออฟฟิศ Onsite)</li>
                    <li>เลือกช่วงวันที่เริ่มต้น - วันที่สิ้นสุด พร้อมระบุเหตุผลความจำเป็น</li>
                    <li><strong>📎 แนบหลักฐานประกอบการลา:</strong> สามารถเลือกไฟล์รูปภาพใบรับรองแพทย์ หรือไฟล์เอกสารราชการ (PDF/JPG/PNG) เพื่อให้หัวหน้างานประกอบการพิจารณา</li>
                    <li>เมื่อหัวหน้างานกดอนุมัติ (Approved) ระบบจะ <strong>ยกเว้นการส่งอีเมลและแจ้งเตือนขาดลงเวลาเข้างาน</strong> ในวันดังกล่าวให้อัตโนมัติ</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 7: Personal Analytics */}
          {matchesSearch('สถิติ ประสิทธิภาพ analytics กราฟ ดาว คะแนน ตรงเวลา on-time rate') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      7. การดูสถิติและประสิทธิภาพการทำงาน (Personal Analytics)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ตรวจสอบอัตราการเข้างานตรงเวลา คะแนนดาวสะสม และสถิติการส่งมอบงาน
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                  <p className="font-bold text-purple-950">ตัวชี้วัดสำคัญบนหน้าสถิติ:</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-purple-950">
                    <li><strong>อัตราเข้างานตรงเวลา (On-time Rate):</strong> สัดส่วนการกดลงเวลาก่อน 08:00 น. ในรอบเดือน</li>
                    <li><strong>คะแนนดาวเฉลี่ย (Average Star Rating):</strong> คุณภาพงานเฉลี่ย 1.0 - 5.0 ดาว ที่ได้รับการประเมินจากหัวหน้า</li>
                    <li><strong>อัตราส่งมอบงาน (Task Completion):</strong> สัดส่วนจำนวนงานที่ทำเสร็จเทียบกับงานที่ได้รับมอบหมาย</li>
                    <li><strong>แนวโน้มรอบ 7 วัน (Weekly Trend):</strong> กราฟไทม์ไลน์แสดงสถานะการเข้างานและผลงานรายวัน</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 8: Suggestion Box & Lunch Break */}
          {matchesSearch('ข้อเสนอแนะ suggestion anonymous ไม่ระบุตัวตน พักเที่ยง lunch break 12:00 13:00') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      8. กล่องรับฟังข้อเสนอแนะ & เวลาพักเที่ยง (Suggestion Box & Lunch Break)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ส่งข้อเสนอแนะปรับปรุงการทำงานแบบไม่ระบุตัวตน และรอบเวลาพักเที่ยง 12:00 - 13:00 น.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-1.5 text-teal-950">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>💬 กล่องข้อเสนอแนะ (Anonymous 100%)</span>
                    </p>
                    <p className="text-[11px] text-teal-900 leading-relaxed">
                      กดปุ่ม <strong>"กล่องข้อเสนอแนะ"</strong> ที่มุมขวาบนของแดชบอร์ด สามารถเลือกติ๊ก <strong>"ส่งแบบไม่ระบุตัวตน"</strong> เพื่อส่งความคิดเห็นหรือข้อร้องเรียนถึงผู้บริหารและแอดมินได้อย่างสบายใจ
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5 text-amber-950">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>🍱 เวลาพักเที่ยง (12:00 - 13:00 น.)</span>
                    </p>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      ในช่วงเวลา 12:00 - 13:00 น. จะมีแถบสถานะพักเที่ยงแสดงบนแดชบอร์ด โดยระบบจะ <strong>ยกเว้นการสุ่มตรวจอัตโนมัติ</strong> เพื่อให้พนักงานได้พักรับประทานอาหารอย่างเต็มที่
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 9: Annual Holidays & Company Policy Document */}
          {matchesSearch('วันหยุด ปฏิทิน holidays นักขัตฤกษ์ ประกาศบริษัท แนบไฟล์ ดาวน์โหลด') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      9. ปฏิทินวันหยุดประจำปี & ไฟล์ประกาศบริษัท (Holiday Calendar & Policy)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ตรวจสอบวันหยุดนักขัตฤกษ์ไทย วันหยุดของบริษัท และเปิดดูเอกสารประกาศทางการ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-2 text-orange-950">
                  <p className="font-bold">วิธีใช้งานปฏิทินวันหยุด:</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-orange-900">
                    <li>กดปุ่ม <strong>"📅 ปฏิทินวันหยุด"</strong> ที่มุมขวาบนของหน้าแดชบอร์ด หรือหน้าขอลาหยุด</li>
                    <li>ตรวจสอบวันหยุดรายเดือน ไฮไลต์สีส้ม 🏖️ และดูตัวนับถอยหลังวันหยุดที่กำลังจะมาถึง</li>
                    <li>สามารถกดปุ่ม <strong>"👁️ เปิดดูประกาศ"</strong> หรือ <strong>"📥 ดาวน์โหลดเอกสาร"</strong> เพื่ออ่านไฟล์ประกาศวันหยุดอย่างเป็นทางการของบริษัท</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {!hasMatches('employee') && renderEmptyState()}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SUPERVISOR MANUAL TAB */}
      {/* ============================================================ */}
      {activeTab === 'supervisor' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/50 dark:from-amber-950/20 to-white dark:to-slate-900">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'en' ? 'Supervisor Operations Manual' : 'คู่มือการปฏิบัติงานสำหรับหัวหน้างาน (Supervisor)'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
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
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      5. การส่งคำสั่งสุ่มตรวจเจาะจงบุคคล (On-Demand Spot Check)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      สั่งสุ่มตรวจลูกทีมเฉพาะกิจพร้อมเสียงแจ้งเตือนและกล่องนับถอยหลัง 10 นาที
                    </CardDescription>
                  </div>
                </div>
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

          {/* Section 6: Supervisor Leave Approvals */}
          {matchesSearch('อนุมัติ ลา ลาป่วย ลากิจ พักร้อน ออฟฟิศ leave approve supervisor') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      6. การพิจารณาอนุมัติคำขอลาของทีม (Leave Approvals)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ตรวจสอบและกดอนุมัติคำขอลาป่วย ลากิจ ลาพักร้อนของสมาชิกในทีม
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                  <p className="font-bold text-blue-950">หลักการพิจารณาคำขอลา:</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-blue-900">
                    <li>ไปที่เมนู <strong>"📅 ขอลาหยุด / สลับวัน"</strong> ➔ เลือกแท็บ <strong>"รายการคำขอลาของทีมที่ต้องพิจารณา"</strong></li>
                    <li>ตรวจสอบชื่อพนักงาน, ช่วงวันที่, และเหตุผลความจำเป็น</li>
                    <li><strong>📎 ตรวจสอบหลักฐานแนบ:</strong> หากมีปุ่ม <em>"📎 ดูหลักฐานแนบ"</em> หัวหน้างานสามารถคลิกเพื่อเปิดดูรูปภาพใบรับรองแพทย์หรือเอกสารราชการแบบ Lightbox ขยายใหญ่ และกดดาวน์โหลดได้ทันที</li>
                    <li>กดปุ่ม <strong>"อนุมัติคำขอ (Approve)"</strong> หรือ <strong>"ปฏิเสธคำขอ (Reject)"</strong> พร้อมระบุหมายเหตุ</li>
                    <li>🛡️ <strong>ระบบป้องกันการอนุมัติใบลาตนเอง (Self-Approval Guard):</strong> เพื่อความโปร่งใส หัวหน้างานไม่สามารถกดอนุมัติหรือปฏิเสธคำขอลาของตนเองได้ โดยคำขอลาของหัวหน้างานจะถูกส่งต่อไปยังผู้บริหารหรือแอดมินเพื่อพิจารณาแทน</li>
                    <li>⚡ <em>หมายเหตุ:</em> กรณีพนักงานแจ้ง <strong>"ปฏิบัติงานที่ออฟฟิศ (Onsite)"</strong> ระบบจะอนุมัติให้อัตโนมัติทันทีโดยไม่ต้องรอหัวหน้ากด</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 7: Team Analytics */}
          {matchesSearch('สถิติทิม analytics กราฟ ประสิทธิภาพ ดาว ตรงเวลา team metrics') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      7. การวิเคราะห์สถิติและคะแนนดาวลูกทีม (Analytics & Performance)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ติดตามอัตราการเข้างานตรงเวลา คะแนนดาวสะสม และแนวโน้มประสิทธิภาพ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-2">
                  <p className="font-bold text-purple-950">การดูสถิติ:</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-purple-900">
                    <li>เข้าเมนู <strong>"📊 สถิติการทำงาน"</strong> เพื่อดูภาพรวมสถิติรายบุคคลและแนวโน้มรอบ 7 วัน</li>
                    <li>สามารถตรวจเช็คอัตราเข้างานตรงเวลา (On-time Rate) และอัตราผ่านการสุ่มตรวจ 10 นาทีได้อย่างโปร่งใส</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 8: Supervisor Notifications */}
          {matchesSearch('แจ้งเตือน อีเมล กระดิ่ง สาย ขาดงาน สุ่มตรวจ supervisor notifications email') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      8. ระบบการแจ้งเตือนสำหรับหัวหน้างาน (Email & In-App Notification Alerts)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      แจ้งเตือนควบคู่กับ Admin ทางอีเมลและกระดิ่งในระบบสำหรับ 4 เหตุการณ์สำคัญ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <p className="font-bold text-slate-900">4 เหตุการณ์ที่หัวหน้างานจะได้รับแจ้งเตือน (Email + กระดิ่ง 🔔):</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-800">
                    <li><strong>เข้างานสาย (หลัง 08:00 น.):</strong> ได้รับอีเมลทันทีพร้อมเหตุผลที่พนักงานระบุ + แจ้งเตือนกระดิ่ง (CC พนักงาน)</li>
                    <li><strong>ไม่ลงเวลาเข้างานช่วงเช้า (หลัง 08:00 น.):</strong> ได้รับอีเมลแจ้งเตือนช่วงเช้ากรณีพนักงานยังไม่ลงเวลาและไม่มีใบลา + แจ้งเตือนกระดิ่ง</li>
                    <li><strong>ขาดงาน (หลัง 12:00 น.):</strong> หากพ้นเที่ยงวันยังไม่มีการลงเวลาเช้าและไม่มีใบลา ได้รับอีเมลแจ้งเตือนขาดงานด่วน + แจ้งเตือนกระดิ่ง</li>
                    <li><strong>ไม่ผ่านการสุ่มตรวจ (เกิน 10 นาที):</strong> หากพนักงานไม่สแกนยืนยันตัวตนใน 10 นาที ได้รับอีเมลแจ้งเตือนด่วน + แจ้งเตือนกระดิ่ง</li>
                  </ul>
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                    🛡️ การกรองข้อความรบกวน: การเปลี่ยนแปลงข้อมูลพนักงานโดย Admin (เช่น เปลี่ยนแผนก, ปรับตำแหน่ง, หรือรีเซ็ต PIN) จะแจ้งเตือนเฉพาะตัวพนักงานเท่านั้น และ<strong>จะไม่ส่งแจ้งเตือนมารบกวนหัวหน้างาน</strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!hasMatches('supervisor') && renderEmptyState()}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ADMIN MANUAL TAB */}
      {/* ============================================================ */}
      {activeTab === 'admin' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/50 dark:from-blue-950/20 to-white dark:to-slate-900">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'en' ? 'System Administrator Manual' : 'คู่มือการปฏิบัติงานสำหรับผู้ดูแลระบบ (Admin)'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
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
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 sm:col-span-2">
                    <p className="font-bold text-blue-900">🛡️ การแจ้งเตือนเฉพาะบุคคล (Privacy Isolation)</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">การแก้ไขข้อมูลพนักงานหรือรีเซ็ต PIN จะส่งแจ้งเตือนเฉพาะพนักงานที่ถูกแก้ไขเท่านั้น และ<strong>จะไม่ส่งแจ้งเตือนไปรบกวนหัวหน้างาน</strong></p>
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

          {/* Section 6: Attendance Alerts & Dual Email */}
          {matchesSearch('แจ้งเตือน ขาดลงเวลา 08:00 ขาดงาน 12:00 สาย สุ่มตรวจ อีเมล alert dual email cron') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      6. ระบบแจ้งเตือนการเข้างานอัตโนมัติ (Dual Email & Exemption Rules)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ส่งอีเมลแจ้งเตือนพร้อมกันทั้ง Admin และหัวหน้างาน สำหรับ 4 เหตุการณ์สำคัญ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-2 text-orange-950">
                  <p className="font-bold">4 เหตุการณ์ที่ระบบส่งอีเมลแจ้งเตือนถึง Admin และหัวหน้างาน:</p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                    <li><strong>เข้างานสาย (หลัง 08:00 น.):</strong> ส่งอีเมลแจ้งเตือนทันทีพร้อมเหตุผลความจำเป็นที่พนักงานกรอก (CC พนักงาน)</li>
                    <li><strong>ยังไม่ลงเวลาช่วงเช้า (หลัง 08:00 น.):</strong> ตรวจจับอัตโนมัติทุกเช้า 08:05 น. และส่งอีเมลแจ้งเตือนติดตามตัว</li>
                    <li><strong>ขาดงาน (หลัง 12:00 น.):</strong> หากพ้น 12:00 น. ยังไม่มีการลงเวลาเช้าและไม่มีใบลา ระบบปรับสถานะเป็นขาดงานและส่งแจ้งเตือนด่วน</li>
                    <li><strong>ไม่ผ่านการสุ่มตรวจ (เกิน 10 นาที):</strong> ไม่ยืนยันตัวตนใน 10 นาที ระบบปรับสถานะและส่งอีเมลแจ้งเตือนด่วนทันที</li>
                  </ul>
                  <p className="pt-1 text-[11px] text-orange-900">
                    • <strong>การยกเว้นอัตโนมัติ (Auto Suppression):</strong> หากพนักงานได้รับการอนุมัติการลา หรือเลือก <strong>"ปฏิบัติงานที่ออฟฟิศ (Onsite)"</strong> ระบบจะข้ามและไม่ส่งการแจ้งเตือนขาดลงเวลาให้
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 7: Suggestions Management */}
          {matchesSearch('ข้อเสนอแนะ suggestion ความคิดเห็น anonymous กล่อง admin desk') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold shrink-0">
                    <MessageSquarePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      7. การบริหารจัดการกล่องข้อเสนอแนะ (Tab 5: ข้อเสนอแนะ)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      อ่านข้อเสนอแนะจากพนักงาน กรองตามหมวดหมู่ และพิมพ์ตอบรับพร้อมปรับสถานะ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-1.5 text-teal-950">
                  <p>1. ไปที่หน้า <strong>Admin Desk</strong> ➔ เลือกแท็บ <strong>"💬 ข้อเสนอแนะ"</strong></p>
                  <p>2. สามารถใช้ตัวกรองหมวดหมู่เพื่อค้นหาข้อเสนอแนะเรื่อง <em>การทำงาน WFH, ระบบและอุปกรณ์, สวัสดิการและสถานที่</em></p>
                  <p>3. กดปุ่ม <strong>"✏️ ตอบรับ & ปรับสถานะ"</strong> เพื่อเปลี่ยนสถานะเป็น <em>รับเรื่องใหม่ / กำลังดำเนินการ / ดำเนินการเรียบร้อย</em> พร้อมพิมพ์บันทึกตอบรับ</p>
                  <p>4. หากพนักงานไม่ได้ส่งแบบไม่ระบุตัวตน ระบบจะส่ง In-App Notification แจ้งเตือนสถานะกลับไปยังพนักงานเจ้าของเรื่องให้อัตโนมัติ</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 8: Holiday & Policy Document Management for Admin */}
          {matchesSearch('จัดการวันหยุด holiday policy แนบไฟล์ ประกาศบริษัท pdf upload admin desk') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <Palmtree className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      8. การจัดการวันหยุดและแนบไฟล์ประกาศบริษัท (Tab 6: วันหยุด & ประกาศ)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      อัปโหลดไฟล์ประกาศวันหยุดประจำปี เพิ่ม/ลบวันหยุดพิเศษ และเปิด-ปิดสถานะการใช้งาน
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-1.5 text-orange-950">
                  <p>1. ไปที่หน้า <strong>Admin Desk</strong> ➔ เลือกแท็บ <strong>"📅 วันหยุด & ประกาศ"</strong></p>
                  <p>2. <strong>แนบไฟล์ประกาศบริษัท:</strong> กดปุ่ม <em>"แนบ / เปลี่ยนไฟล์ประกาศ"</em> เพื่อระบุชื่อไฟล์และลิงก์เอกสารทางการ (เช่น Google Drive, PDF Cloud) เพื่อให้พนักงานกดเปิดดูได้จากหน้าปฏิทิน</p>
                  <p>3. <strong>เพิ่มวันหยุดพิเศษ:</strong> กดปุ่ม <em>"+ เพิ่มวันหยุดบริษัท"</em> เพื่อใส่วันที่และชื่อวันหยุดเฉพาะขององค์กร</p>
                  <p>4. <strong>เปิด-ปิดสถานะ:</strong> สามารถกดปุ่มสลับ <em>"✓ เปิดใช้งาน / ✕ ปิด"</em> ในตารางรายการวันหยุดได้อย่างอิสระ</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 9: Admin Audit Trail & Governance */}
          {matchesSearch('ประวัติ audit trail log ตรวจสอบ แอดมิน ปลดสิทธิ์ แก้ไข พิกัด ผู้ดูแลระบบ') && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-slate-900 font-bold">
                      9. การตรวจสอบประวัติการทำงานของผู้ดูแลระบบ (Tab 7: ประวัติการทำงาน - Audit Trail)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      เก็บบันทึกทุกการกระทำของ Admin และ Supervisor ในระบบเพื่อความโปร่งใสและตรวจสอบย้อนหลังได้ 100%
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2 text-indigo-950">
                  <p className="font-bold">กิจกรรมที่ระบบบันทึก Audit Log ให้อัตโนมัติ:</p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                    <li><strong>🔓 ปลดระงับ / ระงับสิทธิ์ WFH:</strong> บันทึกเมื่อแอดมินทำการปรับสถานะสิทธิ์ WFH ของพนักงาน</li>
                    <li><strong>✏️ แก้ไข / เพิ่มพนักงาน / รีเซ็ต PIN:</strong> บันทึกการเปลี่ยนแปลงข้อมูลและรหัส PIN พนักงาน</li>
                    <li><strong>📸 สิทธิ์ยกเว้นถ่ายภาพ (Photo Exemption):</strong> บันทึกการเปิด-ปิดข้อยกเว้นกล้องถ่ายภาพ</li>
                    <li><strong>⚙️ แก้ไขการตั้งค่าระบบ:</strong> บันทึกการเปลี่ยนพิกัด GPS สำนักงานใหญ่, รัศมีทำการ (Meters), และตำแหน่งยกเว้น</li>
                    <li><strong>🎫 ดำเนินการ Ticket & ข้อเสนอแนะ:</strong> บันทึกการตอบรับและปรับสถานะตั๋วแจ้งปัญหา</li>
                    <li><strong>📅 จัดการวันหยุด & ไฟล์ประกาศ:</strong> บันทึกการเพิ่ม/ลบวันหยุดและอัปโหลดไฟล์ประกาศทางการ</li>
                    <li><strong>✅ อนุมัติ / ปฏิเสธคำขอลา:</strong> บันทึกผลการพิจารณาคำขอลาของหัวหน้างานและแอดมิน</li>
                  </ul>
                  <p className="pt-1 text-[11px] text-indigo-900">
                    💡 <em>คำแนะนำ:</em> สามารถใช้ <strong>ช่องค้นหาด่วน</strong> หรือ <strong>Dropdown กรองประเภทกิจกรรม</strong> เพื่อสืบค้นข้อมูลย้อนหลังตามชื่อแอดมิน, รหัสพนักงานเป้าหมาย หรือรายละเอียดกิจกรรมได้ทันที
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!hasMatches('admin') && renderEmptyState()}
        </div>
      )}
    </div>
  );
}
