'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Ticket as TicketIcon, X, PlusCircle, CheckCircle2, 
  Clock, AlertCircle, RefreshCw, Send, HelpCircle, MessageSquare
} from 'lucide-react';
import { Ticket } from '@/types';
import { useLanguage } from '@/lib/i18n';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROBLEM_TYPES_TH = [
  '📍 ปัญหาพิกัด GPS คลาดเคลื่อน / อยู่นอกพื้นที่',
  '🛡️ ขอตรวจสอบ / ปลดล็อกสิทธิ์ WFH',
  '📸 ปัญหากล้องเว็บแคม / ถ่ายภาพ Selfie ไม่ได้',
  '⏰ ปัญหาการลงเวลาเข้า-ออกงาน / รอบสุ่มตรวจ',
  '💻 ปัญหาระบบขัดข้อง / เว็บไซต์แสดงผลผิดพลาด',
  '❓ อื่นๆ / ขอความช่วยเหลือทั่วไป',
];

const PROBLEM_TYPES_EN = [
  '📍 GPS Coordinate Deviation / Out of Geofence Area',
  '🛡️ Request WFH Review / Unlock Suspended Privilege',
  '📸 Webcam / Live Selfie Camera Issues',
  '⏰ Attendance Clock In/Out / Spot Check Verification Issues',
  '💻 System Bug / Website Display Glitch',
  '❓ Other / General IT Helpdesk Inquiries',
];

export default function SupportTicketModal({ isOpen, onClose }: SupportTicketModalProps) {
  const { t, lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const problemOptions = lang === 'en' ? PROBLEM_TYPES_EN : PROBLEM_TYPES_TH;
  const [problemType, setProblemType] = useState(problemOptions[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // My tickets state
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setProblemType(lang === 'en' ? PROBLEM_TYPES_EN[0] : PROBLEM_TYPES_TH[0]);
  }, [lang]);

  const fetchMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/admin/tickets');
      if (res.ok) {
        const data = await res.json();
        setMyTickets(data.tickets || []);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      fetchMyTickets();
    }
  }, [isOpen]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!description.trim()) {
      setError(lang === 'en' ? 'Please provide a description of the issue.' : 'กรุณากรอกรายละเอียดปัญหา');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

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
        setError(data.error || (lang === 'en' ? 'Failed to submit support ticket.' : 'ส่งตั๋วแจ้งปัญหาไม่สำเร็จ'));
        return;
      }

      setSuccess(lang === 'en' ? 'Support ticket submitted to admin successfully.' : 'ส่งตั๋วแจ้งปัญหาให้แอดมินเรียบร้อยแล้ว');
      try {
        const { playTicketAlertSound } = await import('@/lib/sound');
        playTicketAlertSound();
      } catch {}
      setDescription('');
      fetchMyTickets();
      // Switch to history tab after 1.2 seconds
      setTimeout(() => {
        setActiveTab('history');
      }, 1200);
    } catch {
      setError(lang === 'en' ? 'Server connection error.' : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <Card className="w-full max-w-xl p-6 relative border-slate-200 bg-white shadow-2xl rounded-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          title={lang === 'en' ? 'Close Window' : 'ปิดหน้าต่าง'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <TicketIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              {lang === 'en' ? 'IT Support Ticket Center' : 'ศูนย์แจ้งปัญหาการใช้งาน (IT Support Ticket)'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {lang === 'en'
                ? 'Report system issues, GPS coordinates, or request administrator assistance.'
                : 'แจ้งปัญหาเกี่ยวกับระบบ พิกัด GPS หรือขอความช่วยเหลือจากผู้ดูแลระบบ'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'en' ? 'Create Ticket' : 'แจ้งปัญหาใหม่'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{lang === 'en' ? `My Tickets (${myTickets.length})` : `ประวัติการแจ้งปัญหาของฉัน (${myTickets.length})`}</span>
          </button>
        </div>

        {/* Tab 1: Create Ticket */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmitTicket} className="space-y-4 overflow-y-auto pr-1 flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1.5">
                {lang === 'en' ? 'Problem Category *' : 'หมวดหมู่ปัญหาที่พบ *'}
              </label>
              <select
                value={problemType}
                onChange={(e) => setProblemType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-orange-500"
              >
                {problemOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1.5">
                {lang === 'en' ? 'Issue Details *' : 'รายละเอียดปัญหาที่พบ *'}
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Describe your issue in detail (e.g. unable to clock in due to GPS deviation 350 meters)...'
                    : 'ระบุข้อความอธิบายปัญหา เช่น ไม่สามารถกดเข้างานได้เนื่องจากพิกัดขึ้นว่าอยู่นอกพื้นที่ 350 เมตร...'
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={onClose}
                className="rounded-xl text-xs cursor-pointer"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs gap-1.5 px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'en' ? 'Submitting...' : 'กำลังส่งเรื่อง...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Submit Ticket' : 'ส่งเรื่องแจ้งปัญหา'}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: My Tickets History */}
        {activeTab === 'history' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {loadingTickets ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                <span>{lang === 'en' ? 'Loading tickets...' : 'กำลังโหลดประวัติ Ticket...'}</span>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>{lang === 'en' ? 'No tickets submitted yet' : 'คุณยังไม่เคยส่งตั๋วแจ้งปัญหา'}</p>
              </div>
            ) : (
              myTickets.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{t.problem_type}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>

                    <div>
                      {t.status === 'Resolved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{lang === 'en' ? 'Resolved' : 'แก้ไขแล้ว'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{lang === 'en' ? 'Pending' : 'รอดำเนินการ'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-700 font-medium whitespace-pre-wrap">{t.description || '-'}</p>

                  {t.admin_notes && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px]">
                      <span className="font-bold text-emerald-900">{lang === 'en' ? '💬 Admin Response: ' : '💬 ตอบกลับจากแอดมิน: '}</span>
                      <span className="text-emerald-800 font-medium">{t.admin_notes}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>,
    document.body
  );
}
