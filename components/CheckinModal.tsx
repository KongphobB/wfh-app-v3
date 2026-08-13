'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, X, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { CheckinType, CheckinLog } from '@/types';
import { Button } from '@/components/ui/button';
import { calculateHaversineDistanceKm, MAX_MOVEMENT_DISTANCE_KM } from '@/lib/geo';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: CheckinType;
}

export default function CheckinModal({ isOpen, onClose, onSuccess, defaultType = 'เข้างาน' }: CheckinModalProps) {
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
  const [error, setError] = useState('');

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const isMorningLate = logType === 'เข้างาน' && (currentHour > 8 || (currentHour === 8 && currentMinute > 0));
  const isEarlyLeave = logType === 'ออกงาน' && currentHour < 17;
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
      getGpsLocation();
      startCamera();
      fetchFirstCheckIn();
    } else {
      stopCamera();
      setPhotoDataUrl(null);
      setError('');
      setFirstCheckInGps(null);
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

  const startCamera = async () => {
    try {
      setCameraError('');
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
      setCameraError('ไม่สามารถเข้าถึงกล้องถ่ายภาพได้');
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
    setError('');

    // Rule 1: Morning Check-in Late validation
    if (isMorningLate && !note.trim()) {
      setError('เนื่องจากคุณเข้างานหลังเวลา 08:00 น. กรุณากรอกเหตุผลกรณีเข้าสายด้วยครับ');
      return;
    }

    // Rule 4: Early Leave validation
    if (isEarlyLeave && !note.trim()) {
      setError('เนื่องจากคุณออกงานก่อนเวลา 17:00 น. กรุณากรอกเหตุผลกรณีออกก่อนเวลาด้วยครับ');
      return;
    }

    // Rule 2: Late Round 2 Verification validation
    if (isLateVerify && !note.trim()) {
      setError('เนื่องจากคุณยืนยันตัวตนหลังเวลา 13:20 น. กรุณากรอกเหตุผลกรณีล่าช้าด้วยครับ');
      return;
    }

    // Rule 2: Independent Out-of-Bounds Distance (>20km) validation
    if (isOutOfBounds && !outOfBoundsReason.trim()) {
      const distFormatted = distanceFromFirstCheckIn ? distanceFromFirstCheckIn.toFixed(2) : '0.00';
      setError(`ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินแรกถึง ${distFormatted} กม. (เกิน 20 กม.) กรุณาระบุเหตุผลการเคลื่อนย้ายสถานที่ด้วยครับ`);
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
          note: note.trim() || null,
          out_of_bounds_reason: outOfBoundsReason.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'การลงเวลาล้มเหลว');
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

  if (!isOpen) return null;

  return (
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
          <span>บันทึกเวลาปฏิบัติงาน</span>
        </h2>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Log Type Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              ประเภทการลงเวลา
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['เข้างาน', 'ออกงาน', 'ยืนยันตัวตน'] as CheckinType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLogType(type)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    logType === type
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* GPS Indicator */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 font-bold" />
              <div>
                <span className="font-bold text-slate-800">พิกัด GPS: </span>
                {gpsStatus === 'loading' && <span className="text-orange-600 font-semibold">กำลังดึงพิกัด...</span>}
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
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              title="ดึงพิกัดใหม่"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Camera Viewfinder */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              รูปถ่ายยืนยันตัวตน (SELFIE)
            </label>
            <div className="relative w-full aspect-video rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
              {photoDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoDataUrl} alt="Selfie preview" className="w-full h-full object-cover" />
              ) : isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              ) : (
                <div className="text-center p-4 text-slate-500">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-xs font-bold text-slate-600">{cameraError || 'กำลังเปิดกล้อง...'}</p>
                </div>
              )}
            </div>

            <div className="mt-2.5 flex justify-center">
              {photoDataUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={retakePhoto}
                  size="sm"
                  className="gap-1.5 font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ถ่ายใหม่</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!isCameraActive}
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Camera className="w-4 h-4" />
                  <span>ถ่ายภาพ Selfie</span>
                </Button>
              )}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              หมายเหตุเพิ่มเติม {isMorningLate || isEarlyLeave || isLateVerify ? <span className="text-rose-600 font-bold">* (บังคับระบุเหตุผล)</span> : '(ถ้ามี)'}
            </label>
            <input
              type="text"
              required={isMorningLate || isEarlyLeave || isLateVerify}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isMorningLate
                  ? 'ระบุเหตุผลกรณีเข้าสาย (หลัง 08:00 น.)'
                  : isEarlyLeave
                  ? 'ระบุเหตุผลกรณีออกก่อนเวลา (ก่อน 17:00 น.)'
                  : isLateVerify
                  ? 'ระบุเหตุผลกรณีล่าช้า (หลัง 13:20 น.)'
                  : 'เช่น ปฏิบัติงาน WFH / นัดลูกค้า'
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
                    ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินแรกถึง {distanceFromFirstCheckIn.toFixed(2)} กม. (เกิน 20 กม.) กรุณาระบุเหตุผลการเคลื่อนย้ายสถานที่ก่อนบันทึก
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  เหตุผลการเคลื่อนย้ายสถานที่ {isOutOfBounds ? <span className="text-rose-600 font-bold">* (บังคับระบุเหตุผล)</span> : '(กรณีพิกัดอยู่ห่างเกิน 20 กม. จากจุดเช็คอินแรก)'}
                </label>
                <input
                  type="text"
                  required={isOutOfBounds}
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
  );
}
