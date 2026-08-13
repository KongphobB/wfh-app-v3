import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WFH App v3 — ระบบบันทึกและติดตามการทำงานนอกสถานที่',
  description: 'ระบบลงเวลาการทำงาน GPS, สุ่มตรวจยืนยันตัวตน, และส่งรายงานประเมินผลงาน',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="light" suppressHydrationWarning>
      <body 
        suppressHydrationWarning
        className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-orange-500 selection:text-white`}
      >
        <div className="min-h-screen flex flex-col bg-slate-50">
          {children}
        </div>
      </body>
    </html>
  );
}
