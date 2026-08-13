'use client';

import { useState } from 'react';
import { FileText, Link as LinkIcon, X, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DailyTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DailyTaskModal({ isOpen, onClose, onSuccess }: DailyTaskModalProps) {
  const [tasksAssigned, setTasksAssigned] = useState<number>(1);
  const [tasksCompleted, setTasksCompleted] = useState<number>(1);
  const [details, setDetails] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!details.trim()) {
      setError('กรุณากรอกรายละเอียดงานประจำวัน');
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
        setError(data.error || 'ส่งงานไม่สำเร็จ');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
      setDetails('');
      setSubmissionLink('');
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 bg-white relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-orange-500" />
          <span>ส่งรายงานผลงานประจำวัน</span>
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2 font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                จำนวนงานที่ได้รับมอบหมาย
              </label>
              <input
                type="number"
                min={0}
                value={tasksAssigned}
                onChange={(e) => setTasksAssigned(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                จำนวนงานที่สำเร็จแล้ว
              </label>
              <input
                type="number"
                min={0}
                value={tasksCompleted}
                onChange={(e) => setTasksCompleted(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              รายละเอียดผลงาน / สรุปการทำงานวันนี้
            </label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ระบุรายละเอียดงานที่ทำ ความคืบหน้า หรืออุปสรรค..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 placeholder-slate-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              แนบลิงก์ส่งงาน (ถ้ามี)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
                placeholder="https://github.com/... หรือ https://drive.google.com/..."
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 placeholder-slate-400 font-mono"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>ส่งรายงานประจำวัน</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
