import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SNU WFH — ระบบบันทึกและติดตามการทำงานนอกสถานที่',
  description: 'ระบบลงเวลาการทำงาน GPS, สุ่มตรวจยืนยันตัวตน, และส่งรายงานประเมินผลงาน SNU Supply & Service',
  icons: {
    icon: '/snu-logo.png',
    apple: '/snu-logo.png',
  },
};

import { LanguageProvider } from '@/lib/i18n';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('wfh_theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body 
        suppressHydrationWarning
        className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-orange-500 selection:text-white`}
      >
        <LanguageProvider>
          <div className="min-h-screen flex flex-col bg-slate-50">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
