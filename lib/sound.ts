'use client';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('wfh_sound_enabled');
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('wfh_sound_enabled', enabled ? 'true' : 'false');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('wfh_sound_toggle'));
  }
}

/**
 * Play a crystal-clear dual bell chime for Spot Check alert
 */
export function playSpotCheckChime(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, time: now, dur: 0.3 },       // D5
      { freq: 880.00, time: now + 0.15, dur: 0.5 }, // A5
      { freq: 1174.66, time: now + 0.35, dur: 0.8 },// D6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + dur);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

/**
 * Play gentle notification chime for reminders (e.g. 13:00 Afternoon Verification)
 */
export function playNotificationChime(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 659.25, time: now, dur: 0.35 },       // E5
      { freq: 880.00, time: now + 0.18, dur: 0.6 }, // A5
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + dur);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

/**
 * Play cheerful success chime on check-in / task submission
 */
export function playSuccessChime(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: now, dur: 0.2 },       // C5
      { freq: 659.25, time: now + 0.1, dur: 0.2 }, // E5
      { freq: 783.99, time: now + 0.2, dur: 0.4 }, // G5
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + dur);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

// Backward-compatible alias exports
export const playSpotCheckAlert = playSpotCheckChime;
export const playTicketAlertSound = playNotificationChime;
export const playWarningChime = playNotificationChime;

