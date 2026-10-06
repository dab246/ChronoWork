import type { Language } from '../utils/i18n';

export type DayStatusType =
  | 'work'          // Đi làm tại văn phòng (Office)
  | 'wfh'           // Làm việc từ xa (WFH)
  | 'paid_leave'    // Nghỉ phép năm / Nghỉ off (Day off)
  | 'sick_leave'    // Nghỉ ốm
  | 'holiday'       // Nghỉ lễ
  | 'unpaid_leave'  // Nghỉ không lương
  | 'weekend'       // Cuối tuần
  | 'overtime';     // Làm thêm / Tăng ca

export interface DayStatusConfig {
  id: DayStatusType;
  label: string;
  shortLabel: string;
  isWorkDay: boolean;
  isOfficeDay: boolean;
  isOffDay: boolean;
  defaultHours: number;
  description: string;
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

export type FocusLevel = 'deep' | 'normal' | 'shallow';

export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  taskName: string;
  project: string;
  hours: number; // e.g. 1, 2, 4, 8
  durationMinutes?: number;
  category?: TaskCategory;
  githubUrl?: string; // Link to PR, Issue, or external task
  githubNumber?: number;
  description?: string; // Description of activities
  notes?: string;
  completionPct: number; // e.g. 100, 90, 80
  gapPct: number; // e.g. 0, 10, 20 (auto 100 - completionPct)
  gapReason?: string; // Reason for gap
  gapSolution?: string; // Solution & deadline
  remark?: string; // Notes / remarks
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
  weeklyTargetHours: number; // default 40
  dailyStandardHours: number; // default 8
  defaultOfficeDays: number[]; // 1..5 (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri). E.g. [1, 2, 4] for Mon, Tue, Thu
  officeWorkingDays?: number[]; // fallback alias
  githubToken?: string;
  defaultRepos: string[];
  soundEffects?: boolean;
  language?: Language;
}

export interface ActiveTimerState {
  isRunning: boolean;
  taskName: string;
  project: string;
  category: TaskCategory;
  githubUrl?: string;
  startTime: number | null;
  accumulatedSeconds: number;
}

export const DAY_STATUS_CONFIGS: Record<DayStatusType, DayStatusConfig> = {
  work: {
    id: 'work',
    label: 'Tại văn phòng (Office)',
    shortLabel: 'Văn phòng',
    isWorkDay: true,
    isOfficeDay: true,
    isOffDay: false,
    defaultHours: 8,
    description: 'Làm việc trực tiếp tại văn phòng',
    badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  },
  wfh: {
    id: 'wfh',
    label: 'Làm việc từ xa (WFH)',
    shortLabel: 'WFH',
    isWorkDay: true,
    isOfficeDay: false,
    isOffDay: false,
    defaultHours: 8,
    description: 'Làm việc từ xa / ở nhà (Remote)',
    badgeClass: 'text-sky-700 bg-sky-50 border-sky-300',
  },
  overtime: {
    id: 'overtime',
    label: 'Làm thêm / Tăng ca (OT)',
    shortLabel: 'Tăng ca',
    isWorkDay: true,
    isOfficeDay: false,
    isOffDay: false,
    defaultHours: 4,
    description: 'Làm thêm giờ ngoài 8h tiêu chuẩn',
    badgeClass: 'text-violet-700 bg-violet-50 border-violet-300',
  },
  paid_leave: {
    id: 'paid_leave',
    label: 'Nghỉ off / Nghỉ phép',
    shortLabel: 'Nghỉ off',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: true,
    defaultHours: 0,
    description: 'Nghỉ phép thường niên / ngày off',
    badgeClass: 'text-amber-700 bg-amber-50 border-amber-300',
  },
  sick_leave: {
    id: 'sick_leave',
    label: 'Nghỉ ốm',
    shortLabel: 'Nghỉ ốm',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: true,
    defaultHours: 0,
    description: 'Nghỉ ốm hoặc khám bệnh',
    badgeClass: 'text-rose-700 bg-rose-50 border-rose-300',
  },
  holiday: {
    id: 'holiday',
    label: 'Nghỉ lễ / Tết',
    shortLabel: 'Nghỉ lễ',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: true,
    defaultHours: 0,
    description: 'Nghỉ lễ theo quy định nhà nước',
    badgeClass: 'text-purple-700 bg-purple-50 border-purple-300',
  },
  unpaid_leave: {
    id: 'unpaid_leave',
    label: 'Nghỉ không lương',
    shortLabel: 'Nghỉ KL',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: true,
    defaultHours: 0,
    description: 'Nghỉ việc riêng không hưởng lương',
    badgeClass: 'text-neutral-700 bg-neutral-100 border-neutral-300',
  },
  weekend: {
    id: 'weekend',
    label: 'Cuối tuần',
    shortLabel: 'Cuối tuần',
    isWorkDay: false,
    isOfficeDay: false,
    isOffDay: false,
    defaultHours: 0,
    description: 'Thứ Bảy & Chủ Nhật',
    badgeClass: 'text-neutral-500 bg-neutral-50 border-neutral-200',
  },
};

export const CATEGORY_LABELS: Record<TaskCategory, { label: string; color: string }> = {
  development: { label: 'Feature Dev', color: '#2563EB' },
  pr_review: { label: 'Review PRs', color: '#059669' },
  bugfix: { label: 'Fix Bug', color: '#DC2626' },
  security: { label: 'Security Audit', color: '#7C3AED' },
  release: { label: 'Test & Release', color: '#D97706' },
  meeting: { label: 'Họp & Sync', color: '#4B5563' },
  other: { label: 'Khác', color: '#6B7280' },
};
