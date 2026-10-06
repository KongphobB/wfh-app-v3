'use client';

import { useState } from 'react';
import { Ticket as TicketIcon } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import SupportTicketModal from '@/components/SupportTicketModal';
import LanguageToggle from '@/components/LanguageToggle';
import SoundToggle from '@/components/SoundToggle';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

export default function HeaderActions() {
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* On mobile screens (< md), hide these toggles here because they are placed cleanly inside the mobile drawer menu */}
        <div className="hidden md:flex items-center gap-1.5">
          <LanguageToggle />
          <SoundToggle />
          <ThemeToggle />
        </div>

        {/* Ticket Helpdesk: Icon-only button on mobile, full text on tablet/desktop */}
        <Button
          type="button"
          onClick={() => setIsTicketOpen(true)}
          variant="outline"
          size="sm"
          className="h-9 w-9 sm:w-auto px-0 sm:px-3 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:border-orange-200 text-slate-700 dark:text-slate-300 hover:text-orange-600 font-bold text-xs flex items-center justify-center sm:gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
          title={t.common.itHelpdeskDesc}
        >
          <TicketIcon className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="hidden sm:inline text-xs">{t.common.itHelpdesk}</span>
        </Button>

        <NotificationBell />
      </div>

      <SupportTicketModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
      />
    </>
  );
}
