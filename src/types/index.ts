export type Language = 'vi' | 'en' | 'fr';

export const LANGUAGES: readonly Language[] = ['vi', 'en', 'fr'];

export type DayStatusType =
  | 'work'          // At the office
  | 'wfh'           // Remote
  | 'overtime'      // Overtime
  | 'paid_leave'    // Paid leave / day off
  | 'sick_leave'    // Sick leave
  | 'holiday'       // Public holiday
  | 'unpaid_leave'  // Unpaid leave
  | 'weekend';      // Weekend

export const DAY_STATUSES: readonly DayStatusType[] = [
  'work',
  'wfh',
  'overtime',
  'paid_leave',
  'sick_leave',
  'holiday',
  'unpaid_leave',
  'weekend',
];

export interface DayStatusConfig {
  id: DayStatusType;
  isWorkDay: boolean;
  isOfficeDay: boolean;
  isOffDay: boolean;
  defaultHours: number;
  badgeClass: string;
}

export type TaskCategory =
  | 'development'
  | 'pr_review'
  | 'bugfix'
  | 'security'
  | 'release'
  | 'meeting'
  | 'other';

export const TASK_CATEGORIES: readonly TaskCategory[] = [
  'development',
  'pr_review',
  'bugfix',
  'security',
  'release',
  'meeting',
  'other',
];

export type FocusLevel = 'deep' | 'normal' | 'shallow';

export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  taskName: string;
  project: string;
  hours: number;
  durationMinutes?: number;
  category?: TaskCategory;
  githubUrl?: string; // Link to PR, issue or external task (http/https only)
  githubNumber?: number;
  description?: string;
  notes?: string;
  completionPct: number; // 0..100
  gapPct: number; // 100 - completionPct
  gapReason?: string;
  gapSolution?: string;
  remark?: string;
  isCompleted?: boolean;
  focusLevel?: FocusLevel;
  createdAt: number;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  status: DayStatusType;
  note?: string;
  targetHours?: number;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface WeeklyObjective {
  id: string;
  task: string;
  note: string;
}

export interface WeeklyReflections {
  wentWell: string;
  challenging: string;
  proposal: string;
}

export interface UserSettings {
  userName: string;
  userRole: string;
  companyName: string;
  weeklyTargetHours: number;
  dailyStandardHours: number;
  defaultOfficeDays: number[]; // 1..5 (1 = Monday)
  githubToken?: string; // Kept in this browser only, never exported
  defaultRepos: string[];
  language: Language;
  reportLanguage?: Language; // Defaults to the UI language
  logoDataUrl?: string; // PNG data URL placed in cell A1 of exported reports
}

export const DAY_STATUS_CONFIGS: Record<DayStatusType, DayStatusConfig> = {
  work: {
    id: 'work',
    isWorkDay: true,
    isOfficeDay: true,
    isOffDay: false,
    defaultHours: 8,
    badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  },
  wfh: {
    id: 'wfh',
    isWorkDay: true,
    isOfficeDay: false,
    isOffDay: false,
    defaultHours: 8,
    badgeClass: 'text-sky-700 bg-sky-50 border-sky-300',
  },
  overtime: {
    id: 'overtime',
    isWorkDay: true,
    isOfficeDay: false,
    isOffDay: false,
    defaultHours: 4,
    badgeClass: 'text-violet-700 bg-violet-50 border-violet-300',
  },
  paid_leave: {
    id: 'paid_leave',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: true,
    defaultHours: 0,
    badgeClass: 'text-amber-700 bg-amber-50 border-amber-300',
  },
  sick_leave: {
    id: 'sick_leave',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: true,
    defaultHours: 0,
    badgeClass: 'text-rose-700 bg-rose-50 border-rose-300',
  },
  holiday: {
    id: 'holiday',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: true,
    defaultHours: 0,
    badgeClass: 'text-purple-700 bg-purple-50 border-purple-300',
  },
  unpaid_leave: {
    id: 'unpaid_leave',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: true,
    defaultHours: 0,
    badgeClass: 'text-neutral-700 bg-neutral-100 border-neutral-300',
  },
  weekend: {
    id: 'weekend',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: false,
    defaultHours: 0,
    badgeClass: 'text-neutral-500 bg-neutral-50 border-neutral-200',
  },
};

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  development: '#2563EB',
  pr_review: '#059669',
  bugfix: '#DC2626',
  security: '#7C3AED',
  release: '#D97706',
  meeting: '#4B5563',
  other: '#6B7280',
};
