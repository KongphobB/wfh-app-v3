'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, MapPin, Calendar, Clock, User, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';

export interface LightboxPhotoData {
  url: string;
  name: string;
  employee_id: string;
  time: string;
  date?: string;
  type: string;
  status: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  note?: string | null;
}

interface SelfieLightboxModalProps {
  photo: LightboxPhotoData | null;
  onClose: () => void;
}

export default function SelfieLightboxModal({ photo, onClose }: SelfieLightboxModalProps) {
  const { lang } = useLanguage();
  const [brightness, setBrightness] = useState<number>(100);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setBrightness(100);
  }, [photo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

  const hasGps = photo.gps_lat != null && photo.gps_lng != null;
  const mapsUrl = hasGps ? `https://www.google.com/maps?q=${photo.gps_lat},${photo.gps_lng}` : null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-scale-up flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{photo.name}</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] font-semibold bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  ID: {photo.employee_id}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {photo.time} {photo.date ? `(${photo.date})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                photo.type.includes('เข้างาน')
                  ? 'success'
                  : photo.type.includes('ออกงาน')
                  ? 'destructive'
                  : photo.type.includes('สุ่มตรวจ')
                  ? 'warning'
                  : 'default'
              }
              className="text-xs font-bold"
            >
              {photo.type}
            </Badge>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Photo Viewport */}
        <div className="relative w-full aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden shrink min-h-[280px] p-2">
          {isLoading && !hasError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/60 backdrop-blur-xs">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-orange-200/90 font-medium">
                {lang === 'en' ? 'Loading photo from Google Drive...' : 'กำลังโหลดรูปถ่ายจาก Google Drive...'}
              </span>
            </div>
          )}

          {!hasError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo.url}
              alt={`Live Selfie of ${photo.name}`}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              style={{
                filter: `brightness(${brightness}%) contrast(${brightness > 100 ? 115 : 100}%)`,
                transition: 'filter 0.2s ease-in-out, opacity 0.3s ease',
              }}
              className={`w-full h-full object-contain rounded-xl ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 text-white">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-sm text-emerald-400">
                  {lang === 'en' ? 'Live Selfie Verified' : 'ถ่ายภาพเซลฟี่ยืนยันตัวตนสำเร็จ'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {lang === 'en'
                    ? 'Attendance was verified with live webcam photo and recorded into Google Sheets.'
                    : 'ระบบได้ทำการตรวจสอบภาพถ่ายจากกล้องเว็บแคมสดและบันทึกข้อมูลเข้า Google Sheets เรียบร้อยแล้ว'}
                </p>
              </div>
            </div>
          )}

          {/* Low light brightness boost floating pill (only when image is loaded) */}
          {!hasError && !isLoading && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-700/60 text-[11px] shadow-lg">
              <span className="text-slate-400 font-medium">🔆 {lang === 'en' ? 'Light:' : 'แสง:'}</span>
              <button
                type="button"
                onClick={() => setBrightness(100)}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  brightness === 100 ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {lang === 'en' ? 'Normal' : 'ปกติ'}
              </button>
              <button
                type="button"
                onClick={() => setBrightness(160)}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  brightness === 160 ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                +60%
              </button>
              <button
                type="button"
                onClick={() => setBrightness(220)}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  brightness === 220 ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                +120%
              </button>
            </div>
          )}
        </div>

        {/* Footer Info & Actions */}
        <div className="p-4 px-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="space-y-1">
            <div className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <span>{lang === 'en' ? 'Verification Status:' : 'สถานะการตรวจสอบ:'}</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px]">
                {photo.status}
              </span>
            </div>

            {photo.note && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                💬 <span className="font-medium text-slate-700 dark:text-slate-300">{photo.note}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                title="View GPS Location on Google Maps"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'en' ? 'Google Maps' : 'ดูพิกัดแผนที่'}</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                if (photo.url.startsWith('data:')) {
                  fetch(photo.url)
                    .then((res) => res.blob())
                    .then((blob) => {
                      const blobUrl = URL.createObjectURL(blob);
                      const w = window.open(blobUrl, '_blank');
                      if (!w) {
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.target = '_blank';
                        a.click();
                      }
                    })
                    .catch(() => {
                      const w = window.open('');
                      if (w) {
                        w.document.write(`<title>Selfie - ${photo.name}</title><body style="margin:0;background:#0f172a;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${photo.url}" style="max-width:95vw;max-height:95vh;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);" /></body>`);
                      }
                    });
                } else {
                  window.open(photo.url, '_blank');
                }
              }}
              className="text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Open full resolution image"
            >
              <span>{lang === 'en' ? 'Full Size' : 'เปิดภาพเต็ม'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
