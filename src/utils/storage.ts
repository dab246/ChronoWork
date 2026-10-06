import { TimeEntry, DayLog, UserSettings, WeeklyObjective, WeeklyReflections } from '../types';
import { formatDateIso, getWeekDays } from './dateUtils';

const STORAGE_KEYS = {
  ENTRIES: 'chronowork_entries_v3',
  DAY_LOGS: 'chronowork_day_logs_v3',
  SETTINGS: 'chronowork_settings_v3',
  OBJECTIVES: 'chronowork_objectives_v3',
  REFLECTIONS: 'chronowork_reflections_v3',
};

export const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Dat Vu',
  userRole: 'Mobile Engineer',
  companyName: 'LINAGORA Vietnam',
  weeklyTargetHours: 40,
  dailyStandardHours: 8,
  defaultOfficeDays: [1, 2, 4], // Mon, Tue, Thu
  defaultRepos: ['linagora/twake-mail', 'linagora/tmail-flutter', 'linagora/twake'],
  language: 'vi',
};

export const DEFAULT_PROJECTS = [
  'Twake Mail',
  'Tmail Flutter',
  'Code Review & QA',
  'Support & Meeting',
];

export const DEFAULT_OBJECTIVES: WeeklyObjective[] = [
  { id: 'obj-1', task: 'Tmail tasks', note: 'Sep sprint' },
  { id: 'obj-2', task: 'Upgrade dependencies and fix build pipeline', note: '' },
  { id: 'obj-3', task: 'Review PRs from AI Driven QA', note: 'Daily' },
];

export const DEFAULT_REFLECTIONS: WeeklyReflections = {
  wentWell: 'Hoàn thành tích hợp Sentry cho User settings và fix lỗi refresh JMAP token.',
  challenging: 'Review các PR từ AI Driven QA mất nhiều thời gian kiểm thử edge case.',
  proposal: 'Thống nhất checklist kiểm thử file upload cho các thiết bị di động.',
};

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function getStoredEntries(): TimeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (!raw) {
      const initial = generateSampleEntries();
      saveStoredEntries(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredEntries(entries: TimeEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save entries', e);
  }
}

export function getStoredDayLogs(): Record<string, DayLog> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAY_LOGS);
    if (!raw) {
      const initial = generateSampleDayLogs();
      saveStoredDayLogs(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveStoredDayLogs(logs: Record<string, DayLog>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save day logs', e);
  }
}

export function getStoredObjectives(): WeeklyObjective[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OBJECTIVES);
    if (!raw) return DEFAULT_OBJECTIVES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_OBJECTIVES;
  }
}

export function saveStoredObjectives(objs: WeeklyObjective[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OBJECTIVES, JSON.stringify(objs));
  } catch (e) {
    console.error('Failed to save objectives', e);
  }
}

export function getStoredReflections(): WeeklyReflections {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REFLECTIONS);
    if (!raw) return DEFAULT_REFLECTIONS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_REFLECTIONS;
  }
}

export function saveStoredReflections(refs: WeeklyReflections): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(refs));
  } catch (e) {
    console.error('Failed to save reflections', e);
  }
}

/**
 * Sample entries matching user's real data (Screenshots 1 & 2)
 * Mon: 8h, Tue: 8h, Wed: 8h, Thu: 8h, Fri: 8h = 40h total
 */
export function generateSampleEntries(): TimeEntry[] {
  const currentWeekDays = getWeekDays(new Date());
  const d0 = formatDateIso(currentWeekDays[0]); // Monday (Office)
  const d1 = formatDateIso(currentWeekDays[1]); // Tuesday (Office)
  const d2 = formatDateIso(currentWeekDays[2]); // Wednesday (WFH)
  const d3 = formatDateIso(currentWeekDays[3]); // Thursday (Office)
  const d4 = formatDateIso(currentWeekDays[4]); // Friday (WFH)

  return [
    // Thứ Hai (8h)
    {
      id: 'task-1',
      date: d0,
      taskName: 'Enable sentry in the user setting #4809',
      project: 'Twake Mail',
      hours: 4,
      githubUrl: 'https://github.com/linagora/twake-mail/pull/4809',
      description: 'Tích hợp Sentry crash reporting và cấu hình options',
      completionPct: 90,
      gapPct: 10,
      gapReason: 'As for the final part (Part 3), it is currently awaiting review and merging.',
      gapSolution: 'Waiting review and merge',
      createdAt: Date.now() - 5 * 86400000,
    },
    {
      id: 'task-2',
      date: d0,
      taskName: 'Audit Twake Mail security',
      project: 'Twake Mail',
      hours: 4,
      githubUrl: 'https://app.twake.com',
      description: 'Audit các lỗ hổng bảo mật và CSP header',
      completionPct: 100,
      gapPct: 0,
      createdAt: Date.now() - 5 * 86400000,
    },

    // Thứ Ba (8h)
    {
      id: 'task-3',
      date: d1,
      taskName: 'Review & fixup PRs from AI Driven QA',
      project: 'Code Review & QA',
      hours: 4,
      description: 'Review các PR test tự động và rebase code',
      completionPct: 100,
      gapPct: 0,
      createdAt: Date.now() - 4 * 86400000,
    },
    {
      id: 'task-4',
      date: d1,
      taskName: 'The Blue Bar is dead, long live the Orange Bar! #4623',
      project: 'Twake Mail',
      hours: 4,
      githubUrl: 'https://github.com/linagora/twake-mail/pull/4623',
      description: 'Đổi theme top bar sang màu cam đồng bộ Linagora',
      completionPct: 80,
      gapPct: 20,
      gapReason: 'Waiting review',
      createdAt: Date.now() - 4 * 86400000,
    },

    // Thứ Tư (8h)
    {
      id: 'task-5',
      date: d2,
      taskName: 'Test release version v0.37.x',
      project: 'Twake Mail',
      hours: 6,
      description: 'Kiểm thử toàn diện bản build release trên Android & iOS',
      completionPct: 100,
      gapPct: 0,
      createdAt: Date.now() - 3 * 86400000,
    },
    {
      id: 'task-6',
      date: d2,
      taskName: 'Lost mail composer after refresh #4446',
      project: 'Twake Mail',
      hours: 2,
      githubUrl: 'https://github.com/linagora/twake-mail/issues/4446',
      description: 'Lưu draft tự động tránh mất thư khi refresh',
      completionPct: 100,
      gapPct: 0,
      createdAt: Date.now() - 3 * 86400000,
    },

    // Thứ Năm (8h)
    {
      id: 'task-7',
      date: d3,
      taskName: 'Allow workplace to refresh jmap token - #4810',
      project: 'Twake Mail',
      hours: 5,
      githubUrl: 'https://github.com/linagora/twake-mail/pull/4810',
      description: 'Tự động refresh token jmap khi gặp lỗi 401',
      completionPct: 100,
      gapPct: 0,
      createdAt: Date.now() - 2 * 86400000,
    },
    {
      id: 'task-8',
      date: d3,
      taskName: 'Enable sentry in the user setting #4809',
      project: 'Twake Mail',
      hours: 3,
      githubUrl: 'https://github.com/linagora/twake-mail/pull/4809',
      description: 'Thêm setting bật tắt telemetry cho user',
      completionPct: 90,
      gapPct: 10,
      gapReason: 'As for the final part (Part 3), it is currently awaiting review and merging.',
      createdAt: Date.now() - 2 * 86400000,
    },

    // Thứ Sáu (8h)
    {
      id: 'task-9',
      date: d4,
      taskName: 'The Blue Bar is dead, long live the Orange Bar! #4623',
      project: 'Twake Mail',
      hours: 4,
      githubUrl: 'https://github.com/linagora/twake-mail/pull/4623',
      description: 'Update test snapshot cho giao diện mới',
      completionPct: 80,
      gapPct: 20,
      gapReason: 'Waiting review',
      createdAt: Date.now() - 1 * 86400000,
    },
    {
      id: 'task-10',
      date: d4,
      taskName: 'Enable sentry in the user setting #4809',
      project: 'Twake Mail',
      hours: 3,
      githubUrl: 'https://github.com/linagora/twake-mail/pull/4809',
      description: 'Hoàn thiện PR và test E2E',
      completionPct: 90,
      gapPct: 10,
      gapReason: 'As for the final part (Part 3), it is currently awaiting review and merging.',
      createdAt: Date.now() - 1 * 86400000,
    },
    {
      id: 'task-11',
      date: d4,
      taskName: 'TF-4827 Upgrade file_picker to 13',
      project: 'Tmail Flutter',
      hours: 1,
      githubUrl: 'https://github.com/linagora/tmail-flutter/pull/4457',
      description: 'Nâng cấp thư viện file picker lên bản mới nhất',
      completionPct: 100,
      gapPct: 0,
      createdAt: Date.now() - 1 * 86400000,
    },
  ];
}

export function generateSampleDayLogs(): Record<string, DayLog> {
  const currentWeekDays = getWeekDays(new Date());
  const logs: Record<string, DayLog> = {};

  const d0 = formatDateIso(currentWeekDays[0]); // Monday (Office)
  const d1 = formatDateIso(currentWeekDays[1]); // Tuesday (Office)
  const d2 = formatDateIso(currentWeekDays[2]); // Wednesday (WFH)
  const d3 = formatDateIso(currentWeekDays[3]); // Thursday (Office)
  const d4 = formatDateIso(currentWeekDays[4]); // Friday (WFH)
  const d5 = formatDateIso(currentWeekDays[5]); // Saturday (Weekend)
  const d6 = formatDateIso(currentWeekDays[6]); // Sunday (Weekend)

  logs[d0] = { date: d0, status: 'work', note: 'Văn phòng' };
  logs[d1] = { date: d1, status: 'work', note: 'Văn phòng' };
  logs[d2] = { date: d2, status: 'wfh', note: 'Làm việc từ xa' };
  logs[d3] = { date: d3, status: 'work', note: 'Văn phòng' };
  logs[d4] = { date: d4, status: 'wfh', note: 'Làm việc từ xa' };
  logs[d5] = { date: d5, status: 'weekend' };
  logs[d6] = { date: d6, status: 'weekend' };

  return logs;
}

export function exportAllDataJson(): string {
  const data = {
    version: '3.0',
    exportedAt: new Date().toISOString(),
    settings: getStoredSettings(),
    entries: getStoredEntries(),
    dayLogs: getStoredDayLogs(),
    objectives: getStoredObjectives(),
    reflections: getStoredReflections(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllDataJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.settings) saveStoredSettings(parsed.settings);
    if (Array.isArray(parsed.entries)) saveStoredEntries(parsed.entries);
    if (parsed.dayLogs) saveStoredDayLogs(parsed.dayLogs);
    if (Array.isArray(parsed.objectives)) saveStoredObjectives(parsed.objectives);
    if (parsed.reflections) saveStoredReflections(parsed.reflections);
    return true;
  } catch {
    return false;
  }
}
