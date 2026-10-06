import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SNU WFH — ระบบบันทึกเวลาทำงาน',
    short_name: 'SNU WFH',
    description: 'ระบบบันทึกเวลาปฏิบัติงานนอกสถานที่ สุ่มตรวจยืนยันตัวตน และส่งรายงานผลงาน SNU Supply & Service',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ea580c',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['productivity', 'business'],
    shortcuts: [
      {
        name: 'ลงเวลาเข้า-ออกงาน',
        short_name: 'ลงเวลา',
        url: '/checkin',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'สุ่มตรวจยืนยันตัวตน',
        short_name: 'สุ่มตรวจ',
        url: '/spotcheck',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'ส่งรายงานประจำวัน',
        short_name: 'ส่งงาน',
        url: '/tasks',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
