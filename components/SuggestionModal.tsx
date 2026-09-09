'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, X, Shield, ShieldCheck, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { SuggestionCategory } from '@/types';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SuggestionModal({ isOpen, onClose, onSuccess }: SuggestionModalProps) {
  const { t, lang } = useLanguage();

  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('การทำงาน WFH');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSuccess('');

    if (!topic.trim()) {
      setError(t.suggestion.topicLabel);
      return;
    }

    if (!content.trim()) {
      setError(t.suggestion.contentLabel);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          category,
          content: content.trim(),
          is_anonymous: isAnonymous,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งข้อเสนอแนะ');
      }

      setSuccess(data.message || 'ส่งข้อเสนอแนะเรียบร้อยแล้ว');
      setTimeout(() => {
        setTopic('');
        setContent('');
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const categories: { label: string; value: SuggestionCategory; icon: string }[] = [
    { label: lang === 'en' ? 'WFH Workflow' : 'การทำงาน WFH', value: 'การทำงาน WFH', icon: '💻' },
    { label: lang === 'en' ? 'System & Tools' : 'ระบบและอุปกรณ์', value: 'ระบบและอุปกรณ์', icon: '⚙️' },
    { label: lang === 'en' ? 'General' : 'ทั่วไป', value: 'ทั่วไป', icon: '💡' },
    { label: lang === 'en' ? 'Welfare & Office' : 'สวัสดิการและสถานที่', value: 'สวัสดิการและสถานที่', icon: '🏢' },
    { label: lang === 'en' ? 'Others' : 'อื่นๆ', value: 'อื่นๆ', icon: '📌' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 bg-white relative max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 border border-teal-200 flex items-center justify-center font-bold shrink-0">
            <MessageSquarePlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.suggestion.modalTitle}</h2>
            <p className="text-xs text-slate-500">{t.suggestion.modalSubtitle}</p>
          </div>
        </div>

        {/* Anonymous Toggle Banner */}
        <div
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={`mb-4 p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
            isAnonymous
              ? 'bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 shadow-2xs'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="pt-0.5">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={() => {}}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
          <div className="text-xs flex-1">
            <div className="flex items-center gap-1.5 font-bold">
              {isAnonymous ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Shield className="w-4 h-4 text-slate-400" />
              )}
              <span>{t.suggestion.anonymousToggle}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t.suggestion.anonymousNote}
            </p>
          </div>
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
            <label className="block font-bold text-slate-700 mb-1.5">{t.suggestion.topicLabel}</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.suggestion.topicPlaceholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">{t.suggestion.categoryLabel}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                    category === cat.value
                      ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/40 text-teal-950 font-bold shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-[11px] leading-tight truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">{t.suggestion.contentLabel}</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.suggestion.contentPlaceholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose} className="w-1/2">
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="w-1/2 bg-teal-600 hover:bg-teal-500 text-white font-bold gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? t.common.submitting : t.suggestion.submitBtn}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
