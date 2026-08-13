'use client';

import { useState } from 'react';
import { HelpCircle, X, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TicketModal({ isOpen, onClose, onSuccess }: TicketModalProps) {
  const [problemType, setProblemType] = useState('ปัญหาการลงเวลา GPS');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_type: problemType,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'ส่ง Ticket ไม่สำเร็จ');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
      setDescription('');
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 bg-white relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-orange-500" />
          <span>แจ้งปัญหาและติดต่อแอดมิน</span>
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2 font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              หมวดหมู่ปัญหา
            </label>
            <select
              value={problemType}
              onChange={(e) => setProblemType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 font-semibold"
            >
              <option value="ปัญหาการลงเวลา GPS">ปัญหาการลงเวลา GPS / ระยะพิกัด</option>
              <option value="ปัญหาการเปิดกล้อง / รูปถ่าย">ปัญหาการเปิดกล้อง / รูปถ่าย</option>
              <option value="ปัญหาการสุ่มตรวจ Spot Check">ปัญหาการสุ่มตรวจ Spot Check</option>
              <option value="ขออนุมัติปลดการระงับสิทธิ์ WFH">ขออนุมัติปลดการระงับสิทธิ์ WFH</option>
              <option value="ปัญหาอื่นๆ">ปัญหาอื่นๆ</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              รายละเอียดปัญหา
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="อธิบายรายละเอียดของปัญหาที่พบ..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 placeholder-slate-400 font-medium"
            />
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
                <span>ส่ง Ticket ถึงแอดมิน</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
