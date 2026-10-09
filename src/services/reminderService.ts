/**
 * Browser side of the end-of-day reminder: system notification, chime and
 * spoken message. Every API is optional; a missing or blocked one is skipped,
 * and the in-app snackbar shown by the caller stays the fallback.
 */

export type NotificationState = NotificationPermission | 'unsupported';

const hasNotifications = () => typeof window !== 'undefined' && 'Notification' in window;

export function notificationState(): NotificationState {
  return hasNotifications() ? Notification.permission : 'unsupported';
}

/** Must run from a user gesture (click), or browsers ignore it. */
export async function requestNotificationPermission(): Promise<NotificationState> {
  if (!hasNotifications()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows a system notification; false when not allowed or not supported (e.g. some mobile browsers). */
export function showSystemNotification(title: string, body: string, onClick: () => void): boolean {
  if (notificationState() !== 'granted') return false;
  try {
    const notification = new Notification(title, {
      body,
      tag: 'chronowork-reminder',
      icon: `${import.meta.env.BASE_URL}favicon.svg`,
      requireInteraction: true,
    });
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

type AudioContextClass = typeof AudioContext;

/** Two short bell notes: "ting ting". */
export function playChime(): void {
  const Ctx: AudioContextClass | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    void ctx.resume();
    [0, 0.28].forEach((start) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1318.5; // E6
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.5);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    // Audio blocked until the page has been interacted with
  }
}

const VOICES_TIMEOUT_MS = 1500;

/** System voices; Chrome loads them asynchronously, so wait for them once (bounded). */
function loadVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const voices = synth.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, VOICES_TIMEOUT_MS);
  });
}

/** Voice for the locale (e.g. "vi-VN"), else one of the same language. */
export function voiceFor(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice | undefined {
  const language = locale.slice(0, 2).toLowerCase();
  return voices.find((v) => v.lang === locale) ?? voices.find((v) => v.lang.toLowerCase().startsWith(language));
}

/** Reads the text aloud (text-to-speech with the system voices); nothing happens where speech synthesis is unavailable. */
export async function speak(text: string, locale: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  const voice = voiceFor(await loadVoices(synth), locale);
  if (voice) utterance.voice = voice;
  synth.cancel();
  synth.speak(utterance);
}

export interface ReminderAlert {
  title: string;
  message: string;
  locale: string;
  voice: boolean;
  onOpen: () => void;
}

/** Notification right away, read aloud by text-to-speech once the chime has rung. */
export function alertReminder({ title, message, locale, voice, onOpen }: ReminderAlert): void {
  showSystemNotification(title, message, onOpen);
  if (!voice) return;
  playChime();
  setTimeout(() => void speak(message, locale), 800);
}
