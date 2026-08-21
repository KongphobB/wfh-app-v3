'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playSuccessChime } from '@/lib/sound';
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
      <div className="w-9 h-9 rounded-xl border border-slate-200 bg-white" />
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
        enabled
          ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-orange-600'
          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-400'
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
