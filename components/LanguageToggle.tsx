'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n';

interface LanguageToggleProps {
  className?: string;
}

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-xl shadow-2xs transition-colors shrink-0 ${className}`}
      title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
    >
      <button
        type="button"
        onClick={() => setLang('th')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          lang === 'th'
            ? 'bg-white text-orange-600 shadow-xs font-black'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        TH
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-white text-orange-600 shadow-xs font-black'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        EN
      </button>
    </div>
  );
}
