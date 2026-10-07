'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, X, AlertCircle, CheckCircle2, BellRing, RefreshCw, ShieldCheck, Volume2, SwitchCamera } from 'lucide-react';
import { SpotCheck } from '@/types';
import { Button } from '@/components/ui/button';
import { getSyncedNow, getThaiDateStr } from '@/lib/timeSync';
import { useLanguage } from '@/lib/i18n';
import { playSpotCheckChime } from '@/lib/sound';
import { calculateHaversineDistanceKm, isValidCoordinate, MAX_MOVEMENT_DISTANCE_KM } from '@/lib/geo';

interface SpotCheckModalProps {
  spotCheck: SpotCheck | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SpotCheckModal({ spotCheck, onClose, onSuccess }: SpotCheckModalProps) {
  const { t, lang } = useLanguage();
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [firstCheckInGps, setFirstCheckInGps] = useState<{ lat: number; lng: number } | null>(null);
  const [outOfBoundsReason, setOutOfBoundsReason] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPhotoExempt, setIsPhotoExempt] = useState(false);
  const [employeePosition, setEmployeePosition] = useState('');
  const [popupAlert, setPopupAlert] = useState<{ title: string; message: string } | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('10:00');
  const [isExpired, setIsExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(600);

  let distanceFromFirstCheckIn: number | null = null;
  if (
    isValidCoordinate(gps?.lat, gps?.lng) &&
    isValidCoordinate(firstCheckInGps?.lat, firstCheckInGps?.lng)
  ) {
    distanceFromFirstCheckIn = calculateHaversineDistanceKm(
      gps!.lat,
      gps!.lng,
      firstCheckInGps!.lat,
      firstCheckInGps!.lng
    );
  }

  const isOutOfBounds =
    distanceFromFirstCheckIn !== null &&
    distanceFromFirstCheckIn > MAX_MOVEMENT_DISTANCE_KM; // > 20.0 km

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

  const lastChimeSecRef = useRef<number>(-1);
  const photoDataUrlRef = useRef<string | null>(null);

  useEffect(() => {
    photoDataUrlRef.current = photoDataUrl;
  }, [photoDataUrl]);

  // Play alert chime when Spot Check modal opens
  useEffect(() => {
    if (spotCheck) {
      playSpotCheckChime(true);
      lastChimeSecRef.current = -1;
    }
  }, [spotCheck?.id]);

  // Live 10-minute countdown timer calculation synced with Server Time
  // and periodic reminder chime every 60s within the 10-minute window
  useEffect(() => {
    if (!spotCheck) return;

    const calculateTimeLeft = () => {
      let spotTime = 0;
      if (spotCheck.created_at) {
        spotTime = new Date(spotCheck.created_at).getTime();
      }
      if (!spotTime || isNaN(spotTime)) {
        const today = getThaiDateStr(getSyncedNow());
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

        // Periodic milestone chimes are handled by GlobalSpotCheckWatcher
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [spotCheck]);

  const fetchFirstCheckIn = async () => {
    try {
      const res = await fetch('/api/checkin?scope=self');
      if (res.ok) {
        const data = await res.json();
        const todayStr = getThaiDateStr(getSyncedNow());
        const logs: any[] = data.logs || [];
        const todayMorningLogs = logs.filter(
          (l) => l.log_type === 'เข้างาน' && l.log_date === todayStr
        );
        if (todayMorningLogs.length > 0) {
          todayMorningLogs.sort(
            (a, b) => new Date(a.log_time).getTime() - new Date(b.log_time).getTime()
          );
          const firstLog = todayMorningLogs[0];
          if (firstLog.gps_lat != null && firstLog.gps_lng != null) {
            setFirstCheckInGps({ lat: firstLog.gps_lat, lng: firstLog.gps_lng });
          } else {
            setFirstCheckInGps(null);
          }
        } else {
          setFirstCheckInGps(null);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch morning checkin GPS for spotcheck:', err);
    }
  };

  useEffect(() => {
    if (spotCheck) {
      setPhotoDataUrl(null);
      setPopupAlert(null);
      setOutOfBoundsReason('');
      setFirstCheckInGps(null);
      setFacingMode('user');
      getGpsLocation();
      startCamera('user');
      fetchFirstCheckIn();
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
      setFirstCheckInGps(null);
      setOutOfBoundsReason('');
    }

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden && !photoDataUrlRef.current && spotCheck) {
        if (!streamRef.current || streamRef.current.getVideoTracks().some((t) => t.readyState === 'ended')) {
          startCamera(facingMode);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopCamera();
    };
  }, [spotCheck]);

  const getGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          // If timeout on mobile indoors, fallback to network/cached location
          if (err.code === 3 /* TIMEOUT */) {
            navigator.geolocation.getCurrentPosition(
              (pos2) => {
                setGps({ lat: pos2.coords.latitude, lng: pos2.coords.longitude });
              },
              (err2) => console.warn('SpotCheck GPS fallback error:', err2),
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
          } else {
            console.warn('SpotCheck GPS error:', err);
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setCameraError('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
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
      setCameraError('ไม่สามารถเข้าถึงกล้องได้ (กรุณาอนุญาตการเข้าถึงกล้องเพื่อสุ่มตรวจ)');
      setIsCameraActive(false);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
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
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Viewfinder is a 1:1 square with object-cover.
    // Calculate square crop from center of video stream.
    const cropSize = Math.min(vw, vh);
    const sx = (vw - cropSize) / 2;
    const sy = (vh - cropSize) / 2;

    const targetSize = Math.min(cropSize, 720);
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If user facing (selfie camera), mirror horizontally so photo matches preview WYSIWYG
      if (facingMode === 'user') {
        ctx.translate(targetSize, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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

    if (isOutOfBounds && !outOfBoundsReason.trim()) {
      const distFormatted = distanceFromFirstCheckIn ? distanceFromFirstCheckIn.toFixed(2) : '0.00';
      setPopupAlert({
        title: 'บังคับระบุเหตุผลเคลื่อนย้ายสถานที่',
        message: `ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินเช้าถึง ${distFormatted} กม. (เกิน 20 กม.) กรุณากรอกเหตุผลการเคลื่อนย้ายสถานที่ก่อนบันทึกครับ`,
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
          out_of_bounds_reason: outOfBoundsReason.trim() || null,
          note: outOfBoundsReason.trim() || null,
          distance_km: distanceFromFirstCheckIn ? parseFloat(distanceFromFirstCheckIn.toFixed(2)) : null,
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

      if (photoDataUrl) {
        try {
          localStorage.setItem(`wfh_selfie_spot_${spotCheck.id}`, photoDataUrl);
          localStorage.setItem(`wfh_selfie_${spotCheck.check_date}_สุ่มตรวจ`, photoDataUrl);
        } catch {}
      }

      try {
        localStorage.setItem(`wfh_completed_spot_${spotCheck.id}`, 'true');
        localStorage.removeItem('wfh_active_spotcheck');
      } catch {}

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in safe-area-bottom safe-area-top">
        <div className="glass-card w-full max-w-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-orange-300 bg-white relative max-h-[92dvh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors"
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

          {/* Audio Alert Status & Test Sound */}
          {!isExpired && (
            <div className="flex items-center justify-between text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2 mb-3">
              <div className="flex items-center gap-1.5 font-medium min-w-0">
                <Volume2 className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                <span className="truncate">
                  {lang === 'en'
                    ? 'Alert chime repeats every 1 min (10-min window)'
                    : 'ระบบส่งเสียงเตือนซ้ำทุก 1 นาที (ภายใน 10 นาที)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => playSpotCheckChime(true)}
                className="text-[11px] text-amber-700 hover:text-amber-900 underline font-bold shrink-0 ml-2 cursor-pointer"
                title={lang === 'en' ? 'Test audio chime' : 'ทดสอบระดับเสียง'}
              >
                {lang === 'en' ? 'Test sound' : 'ทดสอบเสียง'}
              </button>
            </div>
          )}

          {/* Exemption Notice */}
          {isPhotoExempt && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{lang === 'en' ? `Your position (${employeePosition || 'Manager'}) is exempt from live selfie capture. You may submit directly.` : `ตำแหน่งของคุณ (${employeePosition || 'หัวหน้า/บริหาร'}) ได้รับการยกเว้นไม่ต้องถ่ายภาพ Selfie สด (สามารถกดส่งยืนยันตัวตนได้ทันที)`}</span>
            </div>
          )}

          {/* Camera Viewfinder */}
          <div className="mb-4">
            <div className="relative w-full max-w-[260px] sm:max-w-[300px] aspect-square mx-auto rounded-3xl bg-slate-900 border-2 border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-lg">
              {photoDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoDataUrl} alt="Spotcheck preview" className="w-full h-full object-cover" />
              ) : isCameraActive ? (
                <>
                  <video
                    ref={setVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'mirror' : ''}`}
                  />

                  {/* Flip camera button */}
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-sm transition-all cursor-pointer shadow-md active:scale-95 z-10"
                    title={lang === 'en' ? 'Switch camera (Front/Back)' : 'สลับกล้องหน้า/หลัง'}
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center p-4 text-slate-300">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-xs font-bold text-slate-200 mb-3 px-2 leading-relaxed">
                    {cameraError || (lang === 'en' ? 'Activating camera...' : 'กำลังเปิดกล้อง...')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startCamera(facingMode)}
                    className="text-xs font-bold gap-1 text-slate-800 bg-white hover:bg-slate-100 cursor-pointer"
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
                    startCamera(facingMode);
                  }}
                  className="text-orange-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> {lang === 'en' ? 'Retake' : 'ถ่ายใหม่'}
                </button>
              )}
            </div>
          </div>

          {/* Out of Bounds Warning & Required Reason Input */}
          {isOutOfBounds && distanceFromFirstCheckIn !== null && (
            <div className="space-y-2 mb-3 text-left animate-fade-in">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  {lang === 'en'
                    ? `Your GPS position is ${distanceFromFirstCheckIn.toFixed(2)} km away from morning check-in (exceeds 20 km). Please specify the reason before submitting.`
                    : `ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินตอนเช้า ${distanceFromFirstCheckIn.toFixed(2)} กม. (เกินระยะ 20 กม.) กรุณาระบุเหตุผลก่อนกดยืนยันครับ`}
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'en' ? 'Reason for Location Change' : 'เหตุผลการเคลื่อนย้ายสถานที่'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={outOfBoundsReason}
                  onChange={(e) => setOutOfBoundsReason(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. Travel to client site / Out of office meeting' : 'เช่น เดินทางไปไซต์งาน / พบคู่ค้า / พบลูกค้า'}
                  className="w-full px-3 py-2 bg-slate-50 border border-rose-300 ring-1 ring-rose-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 font-medium"
                  required
                />
              </div>
            </div>
          )}

          {!photoDataUrl && !isPhotoExempt ? (
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
