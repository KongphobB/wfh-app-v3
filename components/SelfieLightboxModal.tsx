'use client';

import { useEffect } from 'react';
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
        className="bg-white rounded-3xl overflow-hidden max-w-xl w-full shadow-2xl border border-slate-200 relative animate-scale-up flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{photo.name}</span>
                <span className="text-slate-500 font-mono text-[11px] font-semibold bg-slate-200/80 px-2 py-0.5 rounded-md">
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
              className="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Photo Viewport */}
        <div className="relative w-full aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden shrink min-h-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={`Live Selfie of ${photo.name}`}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Footer Info & Actions */}
        <div className="p-4 px-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="space-y-1">
            <div className="text-slate-600 font-medium flex items-center gap-1.5">
              <span>{lang === 'en' ? 'Verification Status:' : 'สถานะการตรวจสอบ:'}</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                {photo.status}
              </span>
            </div>

            {photo.note && (
              <div className="text-[11px] text-slate-500 truncate max-w-xs">
                💬 <span className="font-medium text-slate-700">{photo.note}</span>
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

            <a
              href={photo.url}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Open full resolution image"
            >
              <span>{lang === 'en' ? 'Full Size' : 'เปิดภาพเต็ม'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
