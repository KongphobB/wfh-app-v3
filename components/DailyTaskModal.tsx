'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Link as LinkIcon, X, AlertCircle, Send, Edit3, Info } from 'lucide-react';
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
  const [tasksAssigned, setTasksAssigned] = useState<number>(1);
  const [tasksCompleted, setTasksCompleted] = useState<number>(1);
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
        setTasksAssigned(existingTask.tasks_assigned || 1);
        setTasksCompleted(existingTask.tasks_completed || 1);
        setDetails(existingTask.details || '');
        setSubmissionLink(existingTask.submission_link || '');
      } else {
        setTasksAssigned(1);
        setTasksCompleted(1);
        setDetails('');
        setSubmissionLink('');
      }
      setError('');
    }
  }, [isOpen, existingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!details.trim()) {
      setError(lang === 'en' ? 'Please fill in daily task details' : 'กรุณากรอกรายละเอียดงานประจำวัน');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks_assigned: Number(tasksAssigned),
          tasks_completed: Number(tasksCompleted),
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
      <div className="glass-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 bg-white relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
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
        <p className="text-xs text-slate-500 mb-6">
          {lang === 'en'
            ? 'Fill in your daily work achievements and assigned tasks count for supervisor review.'
            : 'กรอกรายละเอียดผลงานประจำวันและจำนวนงานที่ได้รับมอบหมายเพื่อส่งให้หัวหน้างานประเมิน'}
        </p>

        {isEditing && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 font-medium">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              {lang === 'en'
                ? 'You already submitted a report for today. Existing details are loaded for you to update or append.'
                : 'คุณได้ส่งรายงานของวันนี้ไว้แล้ว ระบบจะดึงข้อมูลเดิมมาให้อัตโนมัติ สามารถแก้ไขหรือพิมพ์สรุปงานใหม่เพิ่มเติมต่อท้ายได้เลยครับ'}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.tasks.tasksAssigned} (items) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={tasksAssigned}
                onChange={(e) => setTasksAssigned(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-orange-500 text-center text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.tasks.tasksCompleted} (items) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={tasksCompleted}
                onChange={(e) => setTasksCompleted(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-orange-500 text-center text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.tasks.detailsLabel} *
            </label>
            <textarea
              required
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'Describe your tasks accomplished today, issues faced, or project progress...'
                  : 'ระบุรายละเอียดงานที่ทำในวันนี้ ปัญหาที่พบ หรือความคืบหน้าของโครงการ...'
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 placeholder-slate-400 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.tasks.linkAttachment} ({lang === 'en' ? 'Optional' : 'ถ้ามี'})
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
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 mt-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t.tasks.submitButton}</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>,
    document.body
  );
}
