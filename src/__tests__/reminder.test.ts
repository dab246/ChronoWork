import { describe, expect, it } from 'vitest';
import { dayNeedsReminder, isReminderDue, isWithinReminderWindow, minutesOfTime } from '../utils/reminder';
import { DEFAULT_SETTINGS, getReminderLastDate, sanitizeReminder, sanitizeSettings, saveReminderLastDate } from '../utils/storage';

const at = (hours: number, minutes: number) => new Date(2026, 9, 9, hours, minutes);
const workDay = { isWorkDay: true, loggedHours: 2, targetHours: 8 };

describe('reminder window', () => {
  it('reads HH:MM as minutes since midnight', () => {
    expect(minutesOfTime('16:30')).toBe(990);
    expect(minutesOfTime('00:05')).toBe(5);
  });

  it('opens at the reminder time and closes an hour later', () => {
    expect(isWithinReminderWindow(at(16, 29), '16:30')).toBe(false);
    expect(isWithinReminderWindow(at(16, 30), '16:30')).toBe(true);
    expect(isWithinReminderWindow(at(17, 29), '16:30')).toBe(true);
    expect(isWithinReminderWindow(at(17, 30), '16:30')).toBe(false);
  });
});

describe('dayNeedsReminder', () => {
  it.each([
    [{ isWorkDay: true, loggedHours: 2, targetHours: 8 }, true],
    [{ isWorkDay: true, loggedHours: 8, targetHours: 8 }, false],
    [{ isWorkDay: true, loggedHours: 0, targetHours: 0 }, true],
    [{ isWorkDay: false, loggedHours: 0, targetHours: 8 }, false],
  ])('%o → %s', (day, expected) => {
    expect(dayNeedsReminder(day)).toBe(expected);
  });
});

describe('isReminderDue', () => {
  it('fires inside the window on a working day not fully logged', () => {
    expect(isReminderDue({ now: at(16, 31), time: '16:30', ...workDay })).toBe(true);
  });

  it('fires at most once a day', () => {
    expect(isReminderDue({ now: at(16, 31), time: '16:30', lastDate: '2026-10-09', ...workDay })).toBe(false);
    expect(isReminderDue({ now: at(16, 31), time: '16:30', lastDate: '2026-10-08', ...workDay })).toBe(true);
  });

  it('does not fire before the time, after the window, or on a day off', () => {
    expect(isReminderDue({ now: at(16, 0), time: '16:30', ...workDay })).toBe(false);
    expect(isReminderDue({ now: at(18, 0), time: '16:30', ...workDay })).toBe(false);
    expect(isReminderDue({ now: at(16, 31), time: '16:30', ...workDay, isWorkDay: false })).toBe(false);
  });
});

describe('reminder settings storage', () => {
  it('defaults to 16:30 with voice on', () => {
    expect(DEFAULT_SETTINGS.reminder).toEqual({ enabled: true, time: '16:30', voice: true });
    expect(sanitizeSettings({}).reminder).toEqual({ enabled: true, time: '16:30', voice: true });
  });

  it('rejects invalid values, caps and trims the message', () => {
    expect(sanitizeReminder({ enabled: 'yes', time: '25:00', voice: 1, message: 'x'.repeat(300) })).toEqual({
      enabled: true,
      time: '16:30',
      voice: true,
      message: 'x'.repeat(200),
    });
    expect(sanitizeReminder({ enabled: false, time: '09:05', voice: false, message: '   ' })).toEqual({ enabled: false, time: '09:05', voice: false, message: undefined });
    expect(sanitizeReminder({ message: '  Log time!  ' }).message).toBe('Log time!');
  });

  it('remembers the last reminder date and ignores a corrupted one', () => {
    saveReminderLastDate('2026-10-09');
    expect(getReminderLastDate()).toBe('2026-10-09');
    localStorage.setItem('chronowork_reminder_last_v1', JSON.stringify('<script>'));
    expect(getReminderLastDate()).toBeUndefined();
  });
});

describe('text-to-speech voice', () => {
  const voice = (lang: string, name = lang) => ({ lang, name }) as SpeechSynthesisVoice;

  it('prefers the exact locale, then the same language', async () => {
    const { voiceFor } = await import('../services/reminderService');
    expect(voiceFor([voice('en-US'), voice('vi-VN', 'Linh')], 'vi-VN')?.name).toBe('Linh');
    expect(voiceFor([voice('en-US'), voice('fr-CA')], 'fr-FR')?.lang).toBe('fr-CA');
    expect(voiceFor([voice('en-US')], 'vi-VN')).toBeUndefined();
  });
});
