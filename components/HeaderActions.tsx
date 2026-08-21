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
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <SoundToggle />
        <ThemeToggle />

        <Button
          type="button"
          onClick={() => setIsTicketOpen(true)}
          variant="outline"
          size="sm"
          className="h-9 px-2.5 sm:px-3 rounded-xl border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 text-slate-700 hover:text-orange-600 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
          title={t.common.itHelpdeskDesc}
        >
          <TicketIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="text-xs">{t.common.itHelpdesk}</span>
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
