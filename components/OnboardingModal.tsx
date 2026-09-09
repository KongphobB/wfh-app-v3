'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, BellRing, FileText, CalendarDays, 
  ChevronRight, ChevronLeft, CheckCircle2, X, BookOpen, ShieldCheck, Clock, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
}

export function OnboardingModal({ isOpen, onClose, employeeId }: OnboardingModalProps) {
  const { t, lang } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleFinish = () => {
    if (employeeId) {
      try {
        localStorage.setItem(`wfh_onboarding_viewed_${employeeId}`, 'true');
      } catch {}
    }
    onClose();
  };

  const steps = [
    {
      id: 0,
      icon: Clock,
      color: 'from-orange-500 to-amber-500',
      bgLight: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40',
      badge: '08:00 AM',
      title: t.onboarding.step1Title,
      desc: t.onboarding.step1Desc,
      points: [t.onboarding.step1Point1, t.onboarding.step1Point2],
      highlight: lang === 'en' ? 'Check-in on time before 08:00 AM!' : 'ลงเวลาก่อน 08:00 น. เพื่อรักษาสถิติตรงเวลา 100%!',
      illustration: (
        <div className="flex items-center justify-center gap-3 p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-orange-100 dark:border-orange-900/30 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xl">
            📷
          </div>
          <div className="text-left text-xs">
            <p className="font-bold text-slate-900">Live Selfie & GPS Location</p>
            <p className="text-slate-500">ถ่ายรูปสดยืนยันตัวตนพร้อมพิกัด</p>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      icon: BellRing,
      color: 'from-rose-500 to-pink-500',
      bgLight: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40',
      badge: '10:00 Min',
      title: t.onboarding.step2Title,
      desc: t.onboarding.step2Desc,
      points: [t.onboarding.step2Point1, t.onboarding.step2Point2],
      highlight: lang === 'en' ? 'Scan within 10 minutes to avoid suspension!' : 'เมื่อมีเสียงเตือน ให้สแกนหน้าภายใน 10 นาทีเพื่อรักษาสิทธิ์ WFH!',
      illustration: (
        <div className="flex items-center justify-center gap-3 p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xl">
            🔔
          </div>
          <div className="text-left text-xs">
            <p className="font-bold text-rose-900">เสียงเตือน "ปิ๊ง-ป่อง!"</p>
            <p className="text-slate-500">กล่องนับถอยหลัง 10:00 นาที</p>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      icon: FileText,
      color: 'from-blue-500 to-indigo-500',
      bgLight: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40',
      badge: '1-5 Stars',
      title: t.onboarding.step3Title,
      desc: t.onboarding.step3Desc,
      points: [t.onboarding.step3Point1, t.onboarding.step3Point2],
      highlight: lang === 'en' ? 'Attach proof links to earn 5-star ratings!' : 'แนบลิงก์ผลงานจริงเพื่อให้หัวหน้าประเมิน 5 ดาวสะสม!',
      illustration: (
        <div className="flex items-center justify-center gap-3 p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl">
            ⭐
          </div>
          <div className="text-left text-xs">
            <p className="font-bold text-blue-900">Daily Task Report</p>
            <p className="text-slate-500">รายงานผลงานพร้อมลิงก์งาน</p>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      icon: CalendarDays,
      color: 'from-emerald-500 to-teal-500',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40',
      badge: 'Auto-Exempt',
      title: t.onboarding.step4Title,
      desc: t.onboarding.step4Desc,
      points: [t.onboarding.step4Point1, t.onboarding.step4Point2],
      highlight: lang === 'en' ? 'Work Onsite is auto-approved instantly!' : 'แจ้งเข้าออฟฟิศ อนุมัติทันทีและยกเว้นการแจ้งเตือนขาดงาน!',
      illustration: (
        <div className="flex items-center justify-center gap-3 p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl">
            🏢
          </div>
          <div className="text-left text-xs">
            <p className="font-bold text-emerald-900">Leave & Schedule</p>
            <p className="text-slate-500">ระบบยกเว้นอีเมลเตือนสายอัตโนมัติ</p>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 bg-white relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleFinish}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {t.onboarding.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.onboarding.subtitle}</p>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-4 gap-1.5 mb-5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                currentStep === idx
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{idx + 1}</span>
              <span className="hidden sm:inline text-[11px]">
                {idx === 0 ? 'เช็คอิน' : idx === 1 ? 'สุ่มตรวจ' : idx === 2 ? 'ส่งงาน' : 'ขอลา'}
              </span>
            </button>
          ))}
        </div>

        {/* Active Step Card */}
        <div className={`p-5 rounded-3xl border ${current.bgLight} space-y-4 transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-linear-to-tr ${current.color} text-white flex items-center justify-center font-bold shadow-xs`}>
                <StepIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">{current.title}</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 dark:bg-slate-900/90 text-slate-700 shadow-2xs">
              {current.badge}
            </span>
          </div>

          {/* Illustration box */}
          {current.illustration}

          {/* Key Bullet points */}
          <div className="space-y-2 text-xs text-slate-700">
            <p className="font-bold text-slate-900">{current.desc}</p>
            <ul className="space-y-1.5 pl-1">
              {current.points.map((p, pIdx) => (
                <li key={pIdx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Highlight Banner */}
          <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 text-[11px] font-semibold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
            <span>{current.highlight}</span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/manual"
            onClick={handleFinish}
            className="text-xs text-slate-500 hover:text-orange-600 flex items-center gap-1 font-semibold transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.onboarding.viewManualBtn}</span>
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="text-xs gap-1 flex-1 sm:flex-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{t.onboarding.prevBtn}</span>
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs gap-1 flex-1 sm:flex-none"
              >
                <span>{t.onboarding.nextBtn}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleFinish}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1 shadow-sm flex-1 sm:flex-none"
              >
                <span>{t.onboarding.getStartedBtn}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
