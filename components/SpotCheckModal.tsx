'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, X, AlertCircle, CheckCircle2, BellRing, RefreshCw } from 'lucide-react';
import { SpotCheck } from '@/types';
import { Button } from '@/components/ui/button';

interface SpotCheckModalProps {
  spotCheck: SpotCheck | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SpotCheckModal({ spotCheck, onClose, onSuccess }: SpotCheckModalProps) {
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (spotCheck) {
      getGpsLocation();
      startCamera();
    } else {
      stopCamera();
      setPhotoDataUrl(null);
      setError('');
    }

    return () => {
      stopCamera();
    };
  }, [spotCheck]);

  const getGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError('ไม่สามารถดึงพิกัด GPS ได้'),
        { enableHighAccuracy: true }
      );
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch {
      setError('ไม่สามารถเปิดกล้องได้');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoDataUrl(dataUrl);
      stopCamera();
    }
  };

  const handleSubmit = async () => {
    if (!spotCheck) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/spotcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spot_check_id: spotCheck.id,
          gps_lat: gps?.lat || null,
          gps_lng: gps?.lng || null,
          photo_base64: photoDataUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'ยืนยันตัวตนไม่สำเร็จ');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoading(false);
    }
  };

  if (!spotCheck) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-orange-300 bg-white relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center animate-pulse shrink-0 font-bold">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">แจ้งเตือนสุ่มตรวจยืนยันตัวตน</h2>
            <p className="text-xs text-orange-600 font-bold">รอบ{spotCheck.round} ({spotCheck.scheduled_time} น.)</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative w-full aspect-video rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
            {photoDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photoDataUrl} alt="Spot check selfie" className="w-full h-full object-cover" />
            ) : isCameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
            ) : (
              <div className="text-slate-500 text-xs flex flex-col items-center">
                <Camera className="w-8 h-8 mb-1 text-slate-400" />
                <span className="font-bold">กำลังเปิดกล้อง...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 font-bold" />
              {gps ? `GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'กำลังดึง GPS...'}
            </span>
            {photoDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setPhotoDataUrl(null);
                  startCamera();
                }}
                className="text-orange-600 hover:underline flex items-center gap-1 font-bold"
              >
                <RefreshCw className="w-3 h-3" /> ถ่ายใหม่
              </button>
            )}
          </div>

          {!photoDataUrl ? (
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={!isCameraActive}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              <Camera className="w-4 h-4" />
              <span>ถ่ายภาพสุ่มตรวจ</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              variant="success"
              className="w-full font-bold"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ส่งผลการสุ่มตรวจ</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
