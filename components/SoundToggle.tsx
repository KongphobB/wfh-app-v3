'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound';
import { useLanguage } from '@/lib/i18n';

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    setMounted(true);
    setEnabled(isSoundEnabled());

    const handleToggle = () => {
      setEnabled(isSoundEnabled());
    };

    window.addEventListener('wfh_sound_toggle', handleToggle);
    return () => window.removeEventListener('wfh_sound_toggle', handleToggle);
  }, []);

  const handleToggle = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    setSoundEnabled(nextState);
  };

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
        enabled
          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-orange-600'
          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-400'
      }`}
      title={
        enabled
          ? (lang === 'en' ? 'Sound alerts enabled (Click to mute)' : 'เปิดเสียงแจ้งเตือนแล้ว (คลิกเพื่อปิดเสียง)')
          : (lang === 'en' ? 'Sound alerts muted (Click to enable)' : 'ปิดเสียงแจ้งเตือนอยู่ (คลิกเพื่อเปิดเสียง)')
      }
      aria-label="Toggle sound alerts"
    >
      {enabled ? (
        <Volume2 className="w-4 h-4 text-emerald-600" />
      ) : (
        <VolumeX className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );
}
