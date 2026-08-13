'use client';

import { useState } from 'react';
import { User, Lock, AlertCircle, ShieldCheck, ArrowRight, Unlock, UserPlus, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [canUnblock, setCanUnblock] = useState(false);
  const [loading, setLoading] = useState(false);

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regEmpId, setRegEmpId] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regPosition, setRegPosition] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  const handleQuickFill = async (empId: string) => {
    setEmployeeId(empId);
    setPin('1234');
    setError('');
    setCanUnblock(false);
  };

  const handleLogin = async (forceUnblock = false) => {
    setError('');

    if (!employeeId) {
      setError('กรุณากรอกรหัสพนักงาน');
      return;
    }
    if (pin.length !== 4) {
      setError('กรุณากรอกรหัส PIN ให้ครบ 4 หลัก');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, pin, unblock: forceUnblock }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'การเข้าสู่ระบบล้มเหลว');
        if (data.canUnblock) setCanUnblock(true);
        setLoading(false);
        return;
      }

      window.location.href = data.redirect || '/dashboard';
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regEmpId || regEmpId.length < 4) {
      setRegError('รหัสพนักงานต้องมีอย่างน้อย 4 หลัก');
      return;
    }
    if (!regName.trim()) {
      setRegError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (regPin.length !== 4) {
      setRegError('รหัส PIN ต้องเป็นตัวเลข 4 หลัก');
      return;
    }
    if (regPin !== regConfirmPin) {
      setRegError('รหัส PIN และ ยืนยัน PIN ไม่ตรงกัน');
      return;
    }

    setRegSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: regEmpId.trim(),
          name: regName.trim(),
          email: regEmail.trim() || undefined,
          department: regDepartment.trim() || undefined,
          position: regPosition.trim() || undefined,
          pin: regPin,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setRegError(data.error || `เกิดข้อผิดพลาดในการลงทะเบียน (HTTP ${res.status})`);
        setRegSubmitting(false);
        return;
      }

      setRegSuccess('ลงทะเบียนพนักงานใหม่สำเร็จ! กำลังเข้าสู่ระบบ...');
      setTimeout(() => {
        setIsRegisterOpen(false);
        window.location.href = data.redirect || '/dashboard';
      }, 500);
    } catch (err: any) {
      setRegError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setRegSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 text-orange-600 mb-4 shadow-xs">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">WFH App v3</h1>
          <p className="text-slate-500 text-sm mt-1">ระบบบันทึกเวลาและติดตามผลการทำงานนอกสถานที่</p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 bg-white">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>

                {canUnblock && (
                  <button
                    type="button"
                    onClick={() => handleLogin(true)}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>ปลดล็อกระงับสิทธิ์ และเข้าสู่ระบบทันที</span>
                  </button>
                )}
              </div>
            )}

            {/* Employee ID Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                รหัสพนักงาน (4 หลัก)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="เช่น 1001"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-base font-semibold transition-colors"
                />
              </div>
            </div>

            {/* PIN Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                รหัส PIN (4 หลัก)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 4) setPin(val);
                  }}
                  placeholder="• • • •"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 tracking-widest font-mono text-xl font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || pin.length !== 4 || !employeeId}
              className="w-full py-4 px-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4 text-base cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">ยังไม่มีรหัสพนักงาน?</span>
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>ลงทะเบียนพนักงานใหม่</span>
            </button>
          </div>

          {/* Quick Demo Test Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center mb-3 font-semibold">
              ⚡ ปุ่มลัดสำหรับทดสอบ (PIN: 1234)
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleQuickFill('1001')}
                className="py-2.5 px-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-center transition-colors shadow-2xs cursor-pointer"
              >
                1001 (พนักงาน)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('0002')}
                className="py-2.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-center transition-colors shadow-2xs cursor-pointer"
              >
                0002 (หัวหน้า)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('0001')}
                className="py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-center transition-colors shadow-2xs cursor-pointer"
              >
                0001 (แอดมิน)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal Dialog */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 bg-white relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center font-bold shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">ลงทะเบียนพนักงานใหม่</h2>
                <p className="text-xs text-slate-500">กรอกข้อมูลเพื่อลงทะเบียนสร้างรหัสผ่านพนักงานสำหรับเข้าใช้งาน</p>
              </div>
            </div>

            {regError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">รหัสพนักงาน (4-6 หลัก) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={regEmpId}
                    onChange={(e) => setRegEmpId(e.target.value)}
                    placeholder="เช่น 1003"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="นาย สมศักดิ์ ใจดี"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">อีเมลพนักงาน</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="somsak@company.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">ตำแหน่งงาน</label>
                  <input
                    type="text"
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    placeholder="เช่น Senior Developer"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">แผนก / ฝ่าย</label>
                  <input
                    type="text"
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    placeholder="เช่น Software Engineering"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">รหัส PIN (4 หลัก) *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    maxLength={4}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • •"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">ยืนยัน PIN (4 หลัก) *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    maxLength={4}
                    value={regConfirmPin}
                    onChange={(e) => setRegConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • •"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} className="w-1/2">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={regSubmitting} className="w-1/2 bg-orange-500 hover:bg-orange-600 text-white font-bold">
                  {regSubmitting ? 'กำลังบันทึก...' : 'ลงทะเบียน และ ล็อกอิน'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
