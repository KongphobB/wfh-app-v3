'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, X, AlertCircle, CheckCircle2, BellRing, RefreshCw, ShieldCheck } from 'lucide-react';
import { SpotCheck } from '@/types';
import { Button } from '@/components/ui/button';
import { getSyncedNow } from '@/lib/timeSync';
import { useLanguage } from '@/lib/i18n';
import { playSpotCheckChime, playSuccessChime } from '@/lib/sound';

interface SpotCheckModalProps {
  spotCheck: SpotCheck | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SpotCheckModal({ spotCheck, onClose, onSuccess }: SpotCheckModalProps) {
  const { t, lang } = useLanguage();
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPhotoExempt, setIsPhotoExempt] = useState(false);
  const [employeePosition, setEmployeePosition] = useState('');
  const [popupAlert, setPopupAlert] = useState<{ title: string; message: string } | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('10:00');
  const [isExpired, setIsExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(600);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Play alert chime when Spot Check modal opens
  useEffect(() => {
    if (spotCheck) {
      playSpotCheckChime();
    }
  }, [spotCheck?.id]);

  // Live 10-minute countdown timer calculation synced with Server Time
  useEffect(() => {
    if (!spotCheck) return;

    const calculateTimeLeft = () => {
      let spotTime = 0;
      if (spotCheck.created_at) {
        spotTime = new Date(spotCheck.created_at).getTime();
      }
      if (!spotTime || isNaN(spotTime)) {
        const today = new Date(getSyncedNow()).toISOString().split('T')[0];
        spotTime = new Date(`${today}T${spotCheck.scheduled_time}+07:00`).getTime();
      }
      if (!spotTime || isNaN(spotTime)) {
        spotTime = getSyncedNow();
      }

      // 10 minutes window from trigger time
      const deadline = spotTime + 10 * 60 * 1000;
      const diffMs = deadline - getSyncedNow();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));

      setRemainingSeconds(diffSecs);

      if (diffSecs <= 0) {
        setIsExpired(true);
        setTimeLeftStr('00:00');
      } else {
        setIsExpired(false);
        const mins = Math.floor(diffSecs / 60);
        const secs = diffSecs % 60;
        setTimeLeftStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [spotCheck]);

  useEffect(() => {
    if (spotCheck) {
      setPhotoDataUrl(null);
      setPopupAlert(null);
      getGpsLocation();
      startCamera();
      fetch('/api/spotcheck')
        .then((r) => r.json())
        .then((d) => {
          if (d.is_photo_exempt != null) setIsPhotoExempt(Boolean(d.is_photo_exempt));
          if (d.employee_position) setEmployeePosition(d.employee_position);
        })
        .catch(() => {});
    } else {
      stopCamera();
      setPhotoDataUrl(null);
      setPopupAlert(null);
    }

    return () => {
      stopCamera();
    };
  }, [spotCheck]);

  const getGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.warn('SpotCheck GPS error:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera error in SpotCheck:', err);
      setCameraError('ไม่สามารถเข้าถึงกล้องเว็บแคมได้ (กรุณาอนุญาตการเข้าถึงกล้องเพื่อสุ่มตรวจ)');
      setIsCameraActive(false);
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
    if (!spotCheck || loading) return;

    if (!photoDataUrl && !isPhotoExempt) {
      setPopupAlert({
        title: 'จำเป็นต้องถ่ายภาพสด (Live Selfie)',
        message: 'กรุณาถ่ายภาพ Selfie จากกล้องสดเพื่อยืนยันตัวตนสุ่มตรวจก่อนบันทึกครับ',
      });
      return;
    }

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
        setPopupAlert({
          title: 'ยืนยันตัวตนไม่สำเร็จ',
          message: data.error || 'เกิดข้อผิดพลาดในการยืนยันตัวตนสุ่มตรวจ กรุณาลองใหม่อีกครั้ง',
        });
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setPopupAlert({
        title: 'ข้อผิดพลาดในการเชื่อมต่อ',
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
      });
      setLoading(false);
    }
  };

  if (!spotCheck) return null;

  return (
    <>
      {/* Popup Alert Dialog Modal */}
      {popupAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="glass-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-orange-200 bg-white text-center relative animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto mb-4 font-bold shadow-inner">
              <AlertCircle className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{popupAlert.title}</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6 px-1">
              {popupAlert.message}
            </p>
            <Button
              type="button"
              onClick={() => setPopupAlert(null)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-2.5 shadow-md shadow-orange-500/20"
            >
              ตกลง / เข้าใจแล้ว
            </Button>
          </div>
        </div>
      )}

      {/* Main Spot Check Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-orange-300 bg-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center animate-pulse shrink-0 font-bold">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t.spotcheck.modalTitle}</h2>
              <p className="text-xs text-orange-600 font-bold">
                {lang === 'en' ? `Round ${spotCheck.round} — Please verify before time runs out` : `รอบ ${spotCheck.round} — กรุณายืนยันตัวตนก่อนหมดเวลา`}
              </p>
            </div>
          </div>

          {/* Countdown Timer Display */}
          <div className={`p-3 rounded-2xl border mb-3 flex items-center justify-between transition-colors ${
            isExpired
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : remainingSeconds <= 120
              ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-amber-500 animate-ping'}`} />
              <span className="text-xs font-bold">
                {isExpired ? (lang === 'en' ? 'Time Status:' : 'สถานะเวลา:') : (lang === 'en' ? 'Countdown:' : 'เวลานับถอยหลัง:')}
              </span>
            </div>
            <div className="font-mono text-sm font-black tracking-wider">
              {isExpired
                ? (lang === 'en' ? 'Expired for this round' : 'หมดเวลาการสุ่มตรวจรอบนี้')
                : `⏳ ${timeLeftStr} ${lang === 'en' ? 'mins' : 'นาที'}`}
            </div>
          </div>

          {/* Exemption Notice */}
          {isPhotoExempt && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{lang === 'en' ? `Your position (${employeePosition || 'Manager'}) is exempt from live selfie capture. You may submit directly.` : `ตำแหน่งของคุณ (${employeePosition || 'หัวหน้า/บริหาร'}) ได้รับการยกเว้นไม่ต้องถ่ายภาพ Selfie สด (สามารถกดส่งยืนยันตัวตนได้ทันที)`}</span>
            </div>
          )}

          {/* Camera Viewfinder */}
          <div className="mb-4">
            <div className="relative w-full aspect-video rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
              {photoDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoDataUrl} alt="Spotcheck preview" className="w-full h-full object-cover" />
              ) : isCameraActive ? (
                <video ref={setVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              ) : (
                <div className="text-center p-4 text-slate-500">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-xs font-bold text-slate-600 mb-3 px-4 leading-relaxed">
                    {cameraError || (lang === 'en' ? 'Activating webcam...' : 'กำลังเปิดกล้องเว็บแคม...')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    className="text-xs font-bold gap-1 text-slate-700 bg-white cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Retry Camera' : 'ลองเปิดกล้องใหม่'}</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-medium mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                {gps ? `GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : (lang === 'en' ? 'Acquiring GPS...' : 'กำลังดึง GPS...')}
              </span>
              {photoDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDataUrl(null);
                    startCamera();
                  }}
                  className="text-orange-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> {lang === 'en' ? 'Retake' : 'ถ่ายใหม่'}
                </button>
              )}
            </div>
          </div>

          {!photoDataUrl ? (
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={!isCameraActive || isExpired}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 shadow-md shadow-orange-500/20 gap-2 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>{lang === 'en' ? 'Capture Live Selfie' : 'ถ่ายภาพสุ่มตรวจสด (Live Selfie)'}</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || isExpired}
              variant="success"
              className="w-full font-bold py-3 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{lang === 'en' ? 'Submit Spot Check' : 'ส่งผลการสุ่มตรวจ'}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
