'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, X, AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { CheckinType, CheckinLog } from '@/types';
import { Button } from '@/components/ui/button';
import { calculateHaversineDistanceKm, MAX_MOVEMENT_DISTANCE_KM } from '@/lib/geo';
import { useLanguage } from '@/lib/i18n';
import { playSuccessChime } from '@/lib/sound';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: CheckinType;
}

export default function CheckinModal({ isOpen, onClose, onSuccess, defaultType = 'เข้างาน' }: CheckinModalProps) {
  const { t, lang } = useLanguage();
  const [logType, setLogType] = useState<CheckinType>(defaultType);
  const [note, setNote] = useState('');
  const [outOfBoundsReason, setOutOfBoundsReason] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsErrorMessage, setGpsErrorMessage] = useState('');
  const [firstCheckInGps, setFirstCheckInGps] = useState<{ lat: number; lng: number } | null>(null);

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(false);
  const [isPhotoExempt, setIsPhotoExempt] = useState(false);
  const [employeePosition, setEmployeePosition] = useState('');
  const [popupAlert, setPopupAlert] = useState<{ title: string; message: string } | null>(null);
  const [successPopup, setSuccessPopup] = useState<{ title: string; message: string } | null>(null);

  const getThaiTime = () => {
    try {
      const thaiTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok', hour12: false });
      const [thHourStr, thMinStr] = thaiTimeStr.split(':');
      return { hour: parseInt(thHourStr, 10), minute: parseInt(thMinStr, 10) };
    } catch {
      const now = new Date();
      return { hour: now.getHours(), minute: now.getMinutes() };
    }
  };

  const thaiTime = getThaiTime();
  const currentHour = thaiTime.hour;
  const currentMinute = thaiTime.minute;

  const isMorningLate = logType === 'เข้างาน' && (currentHour > 8 || (currentHour === 8 && currentMinute > 0));
  const isEarlyLeave = logType === 'ออกงาน' && currentHour < 17;
  const isBeforeVerifyTime = logType === 'ยืนยันตัวตน' && currentHour < 13;
  const isLateVerify = logType === 'ยืนยันตัวตน' && (currentHour > 13 || (currentHour === 13 && currentMinute > 20));

  // Calculate Haversine distance to first check-in GPS for Rule 2 client-side UX gate
  let distanceFromFirstCheckIn: number | null = null;
  if (
    logType === 'ยืนยันตัวตน' &&
    gps?.lat != null &&
    gps?.lng != null &&
    firstCheckInGps?.lat != null &&
    firstCheckInGps?.lng != null
  ) {
    distanceFromFirstCheckIn = calculateHaversineDistanceKm(
      gps.lat,
      gps.lng,
      firstCheckInGps.lat,
      firstCheckInGps.lng
    );
  }

  const isOutOfBounds =
    logType === 'ยืนยันตัวตน' &&
    distanceFromFirstCheckIn !== null &&
    distanceFromFirstCheckIn > MAX_MOVEMENT_DISTANCE_KM; // > 20.0 km

  const fetchFirstCheckIn = async () => {
    try {
      const res = await fetch('/api/checkin?scope=self');
      if (res.ok) {
        const data = await res.json();
        if (data.is_photo_exempt != null) {
          setIsPhotoExempt(Boolean(data.is_photo_exempt));
        }
        if (data.employee_position) {
          setEmployeePosition(data.employee_position);
        }
        const logs: CheckinLog[] = data.logs || [];
        const morningLogs = logs.filter((l) => l.log_type === 'เข้างาน');
        if (morningLogs.length > 0) {
          morningLogs.sort((a, b) => new Date(a.log_time).getTime() - new Date(b.log_time).getTime());
          const firstLog = morningLogs[0];
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
      console.error('Fetch first checkin error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLogType(defaultType);
      setNote('');
      setOutOfBoundsReason('');
      setPopupAlert(null);
      getGpsLocation();
      startCamera();
      fetchFirstCheckIn();
    } else {
      stopCamera();
      setPhotoDataUrl(null);
      setFirstCheckInGps(null);
      setPopupAlert(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, defaultType]);

  const getGpsLocation = () => {
    setGpsStatus('loading');
    setGpsErrorMessage('');

    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMessage('อุปกรณ์นี้ไม่รองรับ Geolocation');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('success');
      },
      (err) => {
        setGpsStatus('error');
        setGpsErrorMessage(err.message || 'ไม่สามารถดึงพิกัด GPS ได้');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

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
      console.warn('Camera error in Checkin:', err);
      setCameraError('ไม่สามารถเข้าถึงกล้องเว็บแคมได้ (กรุณาอนุญาตการเข้าถึงกล้องเพื่อถ่ายภาพ)');
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

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!photoDataUrl && !isPhotoExempt) {
      setPopupAlert({
        title: 'จำเป็นต้องถ่ายภาพ Selfie สด',
        message: 'กรุณาถ่ายภาพ Selfie จากกล้องสดเพื่อยืนยันตัวตนก่อนบันทึกครับ',
      });
      return;
    }

    if (isBeforeVerifyTime) {
      setPopupAlert({
        title: 'ยังไม่ถึงเวลายืนยันตัวตน',
        message: 'รอบการยืนยันตัวตนช่วงบ่ายจะเปิดให้ลงเวลาตั้งแต่เวลา 13:00 - 13:20 น. ครับ',
      });
      return;
    }

    if (isMorningLate && !note.trim()) {
      setPopupAlert({
        title: 'บังคับระบุเหตุผลกรณีเข้าสาย',
        message: 'เนื่องจากคุณลงเวลาเข้างานหลังเวลา 08:00 น. กรุณากรอกเหตุผลการเข้าสายในช่องหมายเหตุเพิ่มเติมด้วยครับ',
      });
      return;
    }

    if (isEarlyLeave && !note.trim()) {
      setPopupAlert({
        title: 'บังคับระบุเหตุผลกรณีออกก่อนเวลา',
        message: 'เนื่องจากคุณลงเวลาออกงานก่อนเวลา 17:00 น. กรุณากรอกเหตุผลการออกก่อนเวลาในช่องหมายเหตุเพิ่มเติมด้วยครับ',
      });
      return;
    }

    if (isLateVerify && !note.trim()) {
      setPopupAlert({
        title: 'บังคับระบุเหตุผลกรณีล่าช้า',
        message: 'เนื่องจากคุณยืนยันตัวตนหลังเวลา 13:20 น. กรุณากรอกเหตุผลการยืนยันตัวตนล่าช้าในช่องหมายเหตุเพิ่มเติมด้วยครับ',
      });
      return;
    }

    if (isOutOfBounds && !outOfBoundsReason.trim()) {
      const distFormatted = distanceFromFirstCheckIn ? distanceFromFirstCheckIn.toFixed(2) : '0.00';
      setPopupAlert({
        title: 'บังคับระบุเหตุผลเคลื่อนย้ายสถานที่',
        message: `ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินแรกถึง ${distFormatted} กม. (เกิน 20 กม.) กรุณาระบุเหตุผลการเคลื่อนย้ายสถานที่ด้วยครับ`,
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: logType,
          gps_lat: gps?.lat || null,
          gps_lng: gps?.lng || null,
          photo_base64: photoDataUrl,
          note: note.trim() || outOfBoundsReason.trim() || null,
          out_of_bounds_reason: outOfBoundsReason.trim() || note.trim() || null,
          reason: outOfBoundsReason.trim() || note.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPopupAlert({
          title: 'การลงเวลาไม่สำเร็จ',
          message: data.error || 'เกิดข้อผิดพลาดในการลงเวลา กรุณาลองใหม่อีกครั้ง',
        });
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccessPopup({
        title: `ลงเวลา${logType}สำเร็จ!`,
        message: data.message || `ระบบได้ทำการบันทึกข้อมูลการลงเวลา ${logType} เรียบร้อยแล้ว`,
      });
    } catch {
      setPopupAlert({
        title: 'ข้อผิดพลาดในการเชื่อมต่อ',
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
      });
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Success Popup Modal */}
      {successPopup && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="glass-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-emerald-200 bg-white text-center relative animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 font-bold shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{successPopup.title}</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6 px-1">
              {successPopup.message}
            </p>
            <Button
              type="button"
              onClick={() => {
                setSuccessPopup(null);
                onSuccess();
                onClose();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl py-2.5 shadow-md shadow-emerald-600/20"
            >
              ตกลง / ยอดเยี่ยม
            </Button>
          </div>
        </div>
      )}

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

      {/* Main Checkin Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div className="glass-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 bg-white relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-orange-500" />
            <span>{t.checkin.modalTitle}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Log Type Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {lang === 'en' ? 'Check-in Type' : 'ประเภทการลงเวลา'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['เข้างาน', 'ออกงาน', 'ยืนยันตัวตน'] as CheckinType[]).map((type) => {
                  const label =
                    type === 'เข้างาน'
                      ? t.checkin.morningCheckin
                      : type === 'ออกงาน'
                      ? t.checkin.eveningCheckout
                      : t.checkin.afternoonVerify;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLogType(type)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        logType === type
                          ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GPS Indicator */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 font-bold" />
                <div>
                  <span className="font-bold text-slate-800">{t.checkin.gpsLocation}: </span>
                  {gpsStatus === 'loading' && <span className="text-orange-600 font-semibold">{t.checkin.gpsAcquiring}</span>}
                  {gpsStatus === 'success' && gps && (
                    <span className="text-emerald-700 font-mono font-bold">
                      {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
                    </span>
                  )}
                  {gpsStatus === 'error' && <span className="text-rose-600 font-semibold">{gpsErrorMessage}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={getGpsLocation}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
                title={lang === 'en' ? 'Refresh GPS' : 'ดึงพิกัดใหม่'}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Viewfinder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t.checkin.selfieLabel}
                </label>
                {isPhotoExempt && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{lang === 'en' ? `Photo Exempt (${employeePosition || 'Manager'})` : `ยกเว้นการถ่ายภาพ (${employeePosition || 'หัวหน้า/บริหาร'})`}</span>
                  </span>
                )}
              </div>

              {isPhotoExempt && !photoDataUrl && (
                <div className="mb-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'en' ? 'Your position is exempt from live selfie requirement. You may proceed directly or take a photo optionally.' : 'ตำแหน่งของคุณได้รับการยกเว้นไม่ต้องถ่ายภาพ Selfie สด (สามารถกดบันทึกได้ทันที หรือถ่ายภาพตามสะดวก)'}</span>
                </div>
              )}
              <div className="relative w-full aspect-video rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                {photoDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photoDataUrl} alt="Selfie preview" className="w-full h-full object-cover" />
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

              <div className="mt-2.5 flex items-center justify-center">
                {photoDataUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={retakePhoto}
                    size="sm"
                    className="gap-1.5 font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t.checkin.retakePhoto}</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!isCameraActive}
                    variant="default"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 py-3 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    <span>{t.checkin.capturePhoto}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.checkin.noteLabel} {isMorningLate || isEarlyLeave || isLateVerify ? <span className="text-rose-600 font-bold">* ({lang === 'en' ? 'Required Reason' : 'บังคับระบุเหตุผล'})</span> : `(${lang === 'en' ? 'Optional' : 'ถ้ามี'})`}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  isMorningLate
                    ? (lang === 'en' ? 'State reason for late arrival (after 08:00 AM)' : 'ระบุเหตุผลกรณีเข้าสาย (หลัง 08:00 น.)')
                    : isEarlyLeave
                    ? (lang === 'en' ? 'State reason for early departure (before 17:00 PM)' : 'ระบุเหตุผลกรณีออกก่อนเวลา (ก่อน 17:00 น.)')
                    : isLateVerify
                    ? (lang === 'en' ? 'State reason for delay (after 13:20 PM)' : 'ระบุเหตุผลกรณีล่าช้า (หลัง 13:20 น.)')
                    : (lang === 'en' ? 'e.g. Working from home / Client meeting' : 'เช่น ปฏิบัติงาน WFH / นัดลูกค้า')
                }
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-orange-500 ${
                  (isMorningLate || isEarlyLeave || isLateVerify) && !note.trim()
                    ? 'border-rose-300 ring-1 ring-rose-300'
                    : 'border-slate-200'
                }`}
              />
            </div>

            {/* Out of Bounds Reason Input & Red Warning Box (Only for Round 2 Verification) */}
            {logType === 'ยืนยันตัวตน' && (
              <div className="space-y-2">
                {isOutOfBounds && distanceFromFirstCheckIn !== null && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>
                      {lang === 'en'
                        ? `Your GPS position is ${distanceFromFirstCheckIn.toFixed(2)} km away from morning check-in (exceeds 20 km). Please specify the reason before submitting.`
                        : `ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินแรกถึง ${distanceFromFirstCheckIn.toFixed(2)} กม. (เกิน 20 กม.) กรุณาระบุเหตุผลการเคลื่อนย้ายสถานที่ก่อนบันทึก`}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    เหตุผลการเคลื่อนย้ายสถานที่ {isOutOfBounds ? <span className="text-rose-600 font-bold">* (บังคับระบุเหตุผล)</span> : '(กรณีพิกัดอยู่ห่างเกิน 20 กม. จากจุดเช็คอินแรก)'}
                  </label>
                  <input
                    type="text"
                    value={outOfBoundsReason}
                    onChange={(e) => setOutOfBoundsReason(e.target.value)}
                    placeholder={
                      isOutOfBounds
                        ? `ระบุเหตุผลเนื่องจากห่างจุดเช็คอินแรก ${distanceFromFirstCheckIn ? distanceFromFirstCheckIn.toFixed(2) : ''} กม.`
                        : 'เช่น เดินทางไปพบลูกค้านอกสถานที่'
                    }
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-orange-500 ${
                      isOutOfBounds && !outOfBoundsReason.trim()
                        ? 'border-rose-300 ring-1 ring-rose-300'
                        : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 mt-4 text-sm shadow-md shadow-orange-500/25"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ยืนยันการลงเวลา</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
