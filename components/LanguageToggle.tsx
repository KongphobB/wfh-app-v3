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
      className={`inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-xl shadow-2xs transition-colors shrink-0 ${className}`}
      title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
    >
      <button
        type="button"
        onClick={() => setLang('th')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          lang === 'th'
            ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs font-black'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        TH
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs font-black'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        EN
      </button>
    </div>
  );
}
