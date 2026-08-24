'use client';

import React, { useState } from 'react';
import { CalendarDays, X, AlertCircle, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { LeaveType } from '@/types';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LeaveRequestModal({ isOpen, onClose, onSuccess }: LeaveRequestModalProps) {
  const { t } = useLanguage();
  const todayStr = new Date().toISOString().split('T')[0];

  const [leaveType, setLeaveType] = useState<LeaveType>('ลาป่วย');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSuccess('');

    if (!startDate || !endDate) {
      setError(t.common.required);
      return;
    }

    if (startDate > endDate) {
      setError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    if (!reason.trim()) {
      setError('กรุณาระบุเหตุผลความจำเป็นในการลา');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งคำขอ');
      }

      setSuccess(data.message || 'ยื่นคำขอลาเรียบร้อยแล้ว');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 bg-white relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center font-bold shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.leave.modalTitle}</h2>
            <p className="text-xs text-slate-500">{t.leave.modalSubtitle}</p>
          </div>
        </div>

        {/* Auto Exemption Notice */}
        <div className="mb-4 p-3.5 rounded-2xl bg-orange-50/90 border border-orange-200/90 dark:bg-orange-950/30 dark:border-orange-800/40 text-xs text-orange-950 dark:text-orange-200 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
          <span>{t.leave.autoExemptNote}</span>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">{t.leave.leaveTypeLabel}</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'ลาป่วย' as LeaveType, label: t.leave.sickLeave, icon: '🤒' },
                { type: 'ลากิจ' as LeaveType, label: t.leave.personalLeave, icon: '💼' },
                { type: 'ลาพักร้อน' as LeaveType, label: t.leave.vacationLeave, icon: '🏖️' },
                { type: 'ปฏิบัติงานที่ออฟฟิศ (Onsite)' as LeaveType, label: t.leave.onsiteLeave, icon: '🏢' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setLeaveType(item.type)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                    leaveType === item.type
                      ? 'border-orange-500 bg-orange-50/80 dark:bg-orange-950/40 text-orange-950 font-bold shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[11px] leading-tight">{item.label}</span>
                  </div>
                  {item.type === 'ปฏิบัติงานที่ออฟฟิศ (Onsite)' && (
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md self-start">
                      ⚡ อนุมัติทันที ไม่ต้องรอหัวหน้า
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">{t.leave.startDateLabel}</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">{t.leave.endDateLabel}</label>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">{t.leave.reasonLabel}</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.leave.reasonPlaceholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose} className="w-1/2">
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="w-1/2 bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              {submitting ? t.common.submitting : t.leave.requestBtn}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
