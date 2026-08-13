'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Lock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ChangePinPage() {
  const router = useRouter();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      setError('กรุณากรอกรหัส PIN ทั้ง 3 ช่อง ช่องละ 4 หลัก');
      return;
    }

    if (newPin !== confirmPin) {
      setError('รหัส PIN ใหม่ และ ยืนยัน PIN ไม่ตรงกัน');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin, newPin, confirmPin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เปลี่ยนรหัส PIN ไม่สำเร็จ');
        setLoading(false);
        return;
      }

      setSuccess('เปลี่ยนรหัส PIN สำเร็จ! กำลังนำท่านไปยังหน้าหลัก...');
      setTimeout(() => {
        router.push(data.redirect || '/dashboard');
        router.refresh();
      }, 1500);
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 border border-orange-200 text-orange-600 mb-3 shadow-xs font-bold">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">เปลี่ยนรหัส PIN ใหม่</h1>
          <p className="text-slate-500 text-sm mt-1">
            เพื่อความปลอดภัยของบัญชี กรุณาตั้งรหัส PIN 4 หลักใหม่ก่อนเข้าใช้งาน
          </p>
        </div>

        {/* Card */}
        <Card className="p-6 sm:p-8 shadow-xl border border-slate-200 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Old PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                PIN ปัจจุบัน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="PIN เดิม (เริ่มต้น: 1234)"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 text-base"
                />
              </div>
            </div>

            {/* New PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                PIN ใหม่ (4 หลัก)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5 text-orange-500" />
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="PIN ใหม่ 4 หลัก"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 text-base"
                />
              </div>
            </div>

            {/* Confirm PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ยืนยัน PIN ใหม่
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5 text-orange-500" />
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="กรอก PIN ใหม่ซ้ำอีกครั้ง"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 text-base"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>ยืนยันการเปลี่ยน PIN</span>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
