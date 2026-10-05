'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X, AlertCircle, Send, Edit3, Info, Link as LinkIcon, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskItem } from '@/types';
import { useLanguage } from '@/lib/i18n';
import { playSuccessChime } from '@/lib/sound';

interface DailyTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTask?: TaskItem | null;
}

export default function DailyTaskModal({ isOpen, onClose, onSuccess, existingTask }: DailyTaskModalProps) {
  const { t, lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [tasksCompleted, setTasksCompleted] = useState<number>(1);
  const [tasksRemaining, setTasksRemaining] = useState<number>(0);
  const [details, setDetails] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (existingTask) {
        const comp = existingTask.tasks_completed ?? 1;
        const rem =
          existingTask.tasks_remaining ??
          Math.max(0, (existingTask.tasks_assigned || 0) - comp);
        setTasksCompleted(comp);
        setTasksRemaining(rem);
        setDetails(existingTask.details || '');
        setSubmissionLink(existingTask.submission_link || '');
      } else {
        setTasksCompleted(1);
        setTasksRemaining(0);
        setDetails('');
        setSubmissionLink('');
      }
      setError('');
    }
  }, [isOpen, existingTask]);

  const totalHandled = Math.max(1, tasksCompleted + tasksRemaining);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!details.trim()) {
      setError(lang === 'en' ? 'Please fill in daily work details' : 'กรุณากรอกรายละเอียดงานประจำวัน');
      return;
    }

    if (tasksCompleted < 0 || tasksRemaining < 0) {
      setError(lang === 'en' ? 'Task counts cannot be negative' : 'จำนวนงานต้องไม่ติดลบ');
      return;
    }

    if (totalHandled <= 0) {
      setError(lang === 'en' ? 'Total tasks must be greater than 0' : 'จำนวนงานรวมต้องมากกว่า 0');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks_assigned: totalHandled,
          tasks_completed: Number(tasksCompleted),
          tasks_remaining: Number(tasksRemaining),
          details: details.trim(),
          submission_link: submissionLink.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (lang === 'en' ? 'Failed to submit report' : 'ส่งงานไม่สำเร็จ'));
        setLoading(false);
        return;
      }

      playSuccessChime();
      onSuccess();
      onClose();
    } catch {
      setError(lang === 'en' ? 'Server connection error' : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const isEditing = !!existingTask;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 bg-white relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-1.5 flex items-center gap-2">
          {isEditing ? (
            <>
              <Edit3 className="w-6 h-6 text-orange-500" />
              <span>{t.tasks.editTodayReport}</span>
            </>
          ) : (
            <>
              <FileText className="w-6 h-6 text-orange-500" />
              <span>{t.tasks.modalTitle}</span>
            </>
          )}
        </h2>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          {t.tasks.subtitle}
        </p>

        {isEditing && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 font-medium">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              {lang === 'en'
                ? 'You already submitted a report for today. Existing details are loaded for you to update or append.'
                : 'คุณได้ส่งรายงานของวันนี้ไว้แล้ว ระบบดึงข้อมูลเดิมมาให้อัตโนมัติ สามารถแก้ไขหรือพิมพ์สรุปงานใหม่เพิ่มเติมได้เลยครับ'}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Field 1: Tasks Completed */}
            <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
              <label className="block text-xs font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.tasks.tasksCompleted} *</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={tasksCompleted}
                onChange={(e) => setTasksCompleted(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-emerald-950 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-base"
              />
              <span className="block text-[11px] text-emerald-700/80 mt-1 text-center font-medium">
                {lang === 'en' ? 'Completed today' : 'งานที่ทำเสร็จจริงในวันนี้'}
              </span>
            </div>

            {/* Field 2: Tasks Remaining for Tomorrow */}
            <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
              <label className="block text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{t.tasks.tasksRemaining}</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={tasksRemaining}
                onChange={(e) => setTasksRemaining(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-amber-950 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-center text-base"
              />
              <span className="block text-[11px] text-amber-700/80 mt-1 text-center font-medium">
                {lang === 'en' ? 'Carry over to tomorrow' : 'ยกยอดไปทำต่อในวันพรุ่งนี้'}
              </span>
            </div>
          </div>

          {/* Dynamic Summary Breakdown Bar */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">{t.tasks.totalTasksSummary}:</span>
              <span className="font-black text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-md text-xs">
                {totalHandled} {lang === 'en' ? 'items' : 'รายการ'}
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-2">
              <span className="text-emerald-700 font-bold">✓ เสร็จ {tasksCompleted}</span>
              <span className="text-amber-700 font-bold">⏳ ต่อพรุ่งนี้ {tasksRemaining}</span>
            </div>
          </div>

          {/* Field 3: Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.tasks.detailsLabel} *
            </label>
            <textarea
              required
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t.tasks.detailsPlaceholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 placeholder-slate-400 leading-relaxed"
            />
          </div>

          {/* Field 4: Submission Link (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.tasks.linkAttachment}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
                placeholder={lang === 'en' ? 'https://github.com/... or https://drive.google.com/...' : 'https://github.com/... หรือ https://drive.google.com/...'}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 placeholder-slate-400 font-mono"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 mt-2 cursor-pointer shadow-md shadow-orange-500/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{isEditing ? (lang === 'en' ? 'Update Report' : 'บันทึกการแก้ไขรายงาน') : t.tasks.submitButton}</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>,
    document.body
  );
}
