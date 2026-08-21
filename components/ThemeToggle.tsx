'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('wfh_theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('wfh_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('wfh_theme', 'light');
    }
  };

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl border border-slate-200 bg-white" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
        isDark
          ? 'border-indigo-800/80 bg-indigo-950/60 text-indigo-400 hover:bg-indigo-900/60 shadow-indigo-950/30'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
      title={
        isDark
          ? lang === 'en'
            ? 'Switch to Light Mode'
            : 'สลับเป็นโหมดสว่าง (Light Mode)'
          : lang === 'en'
          ? 'Switch to Dark Mode'
          : 'สลับเป็นโหมดมืด (Dark Mode)'
      }
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600" />
      )}
    </button>
  );
}
