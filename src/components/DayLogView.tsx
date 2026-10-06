import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  GitPullRequest, 
  ExternalLink, 
  Check, 
  Clock, 
  Building2, 
  Home, 
  Coffee,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TimeEntry, DayLog, UserSettings, DayStatusType, DAY_STATUS_CONFIGS } from '../types';
import { 
  formatDateIso, 
  formatVietnameseDate, 
  formatShortDate, 
  isToday 
} from '../utils/dateUtils';
import { searchGitHubIssuesAndPRs, fetchGitHubDetailsByUrl, GitHubItem } from '../services/githubService';
import { getTranslations } from '../utils/i18n';

interface DayLogViewProps {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  projects: string[];
  onSaveTask: (entry: Omit<TimeEntry, 'id' | 'createdAt'>, editingId?: string) => void;
  onDeleteTask: (id: string) => void;
  onSetDayStatus: (dateIso: string, status: DayStatusType) => void;
}

export const DayLogView: React.FC<DayLogViewProps> = ({
  selectedDate,
  setSelectedDate,
  entries,
  dayLogs,
  settings,
  projects,
  onSaveTask,
  onDeleteTask,
  onSetDayStatus,
}) => {
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);

  const lang = settings.language || 'vi';
  const t = getTranslations(lang);

  const dateIso = formatDateIso(selectedDate);
  const dayLog = dayLogs[dateIso];
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();

  // Status for today: from dayLog, or check defaultOfficeDays, or weekend
  const defaultStatus: DayStatusType = isWeekend
    ? 'weekend'
    : settings.defaultOfficeDays.includes(dayOfWeek)
    ? 'work'
    : 'wfh';
  const currentStatus = dayLog ? dayLog.status : defaultStatus;
  const statusCfg = DAY_STATUS_CONFIGS[currentStatus];

  const isOffDay =
    currentStatus === 'paid_leave' ||
    currentStatus === 'sick_leave' ||
    currentStatus === 'holiday' ||
    currentStatus === 'unpaid_leave';

  // Entries for this date
  const dayEntries = entries.filter((e) => e.date === dateIso);
  const totalDayHours = dayEntries.reduce((acc, curr) => acc + (curr.hours || 0), 0);
  const targetDayHours = isOffDay || currentStatus === 'weekend' ? 0 : 8;

  // End-of-Day Form States
  const [taskName, setTaskName] = useState('');
  const [project, setProject] = useState(projects[0] || 'Twake Mail');
  const [hours, setHours] = useState('4');
  const [githubUrl, setGithubUrl] = useState('');
  const [description, setDescription] = useState('');
  const [completionPct, setCompletionPct] = useState(100);
  const [gapReason, setGapReason] = useState('');
  const [gapSolution, setGapSolution] = useState('');
  const [remark, setRemark] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // GitHub search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingGitHub, setIsSearchingGitHub] = useState(false);
  const [searchResults, setSearchResults] = useState<GitHubItem[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
    resetForm();
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
    resetForm();
  };

  const handleToday = () => {
    setSelectedDate(new Date());
    resetForm();
  };

  const resetForm = () => {
    setTaskName('');
    setHours('4');
    setGithubUrl('');
    setDescription('');
    setCompletionPct(100);
    setGapReason('');
    setGapSolution('');
    setRemark('');
    setEditingId(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
  };

  // Search GitHub / Paste URL
  const handleSearchGitHub = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    if (val.includes('github.com/')) {
      setIsSearchingGitHub(true);
      const item = await fetchGitHubDetailsByUrl(val, settings.githubToken);
      setIsSearchingGitHub(false);
      if (item) {
        setSearchResults([item]);
        setShowSearchDropdown(true);
      }
      return;
    }

    if (val.trim().length >= 2) {
      setIsSearchingGitHub(true);
      const results = await searchGitHubIssuesAndPRs(val, settings.defaultRepos, settings.githubToken);
      setIsSearchingGitHub(false);
      setSearchResults(results);
      setShowSearchDropdown(true);
    }
  };

  const handleSelectGitHubItem = (item: GitHubItem) => {
    setTaskName(`${item.title} #${item.number}`);
    setGithubUrl(item.html_url);
    if (item.repoName.includes('tmail')) {
      setProject('Tmail Flutter');
    } else if (item.repoName.includes('twake')) {
      setProject('Twake Mail');
    }
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  const handleStartEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setTaskName(entry.taskName);
    setProject(entry.project);
    setHours(String(entry.hours));
    setGithubUrl(entry.githubUrl || '');
    setDescription(entry.description || '');
    setCompletionPct(entry.completionPct ?? 100);
    setGapReason(entry.gapReason || '');
    setGapSolution(entry.gapSolution || '');
    setRemark(entry.remark || '');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) {
      alert('Vui lòng nhập tên công việc!');
      return;
    }
    const h = parseFloat(hours) || 4;
    const comp = Number(completionPct) || 100;
    const gap = Math.max(0, 100 - comp);

    onSaveTask(
      {
        date: dateIso,
        taskName: taskName.trim(),
        project,
        hours: h,
        durationMinutes: Math.round(h * 60),
        githubUrl: githubUrl.trim() || undefined,
        description: description.trim() || undefined,
        completionPct: comp,
        gapPct: gap,
        gapReason: gap > 0 ? gapReason.trim() : undefined,
        gapSolution: gap > 0 ? gapSolution.trim() : undefined,
        remark: remark.trim() || undefined,
      },
      editingId || undefined
    );

    resetForm();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header: Date Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            Log Time Cuối Ngày Làm Việc
          </h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Trước khi ra về, ghi nhận các task đã làm, gắn link GitHub, cập nhật tiến độ và lý do
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isToday(dateIso) && (
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Hôm nay
            </button>
          )}

          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={handlePrevDay}
              title="Ngày trước"
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  datePickerRef.current?.showPicker();
                } catch {
                  datePickerRef.current?.focus();
                }
              }}
              title="Mở lịch chọn ngày (Calendar Picker)"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{formatVietnameseDate(selectedDate)}</span>
            </button>
            <input
              ref={datePickerRef}
              type="date"
              value={dateIso}
              onChange={(e) => {
                if (e.target.value) {
                  const parts = e.target.value.split('-');
                  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  setSelectedDate(d);
                  resetForm();
                }
              }}
              className="sr-only"
            />

            <button
              onClick={handleNextDay}
              title="Ngày sau"
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Day Status & Hours Tracker Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Day Status Toggle Buttons */}
          <div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Trạng thái ngày:
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onSetDayStatus(dateIso, 'work')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  currentStatus === 'work'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Tại văn phòng</span>
              </button>

              <button
                type="button"
                onClick={() => onSetDayStatus(dateIso, 'wfh')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  currentStatus === 'wfh'
                    ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Làm từ xa (WFH)</span>
              </button>

              <button
                type="button"
                onClick={() => onSetDayStatus(dateIso, 'paid_leave')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  currentStatus === 'paid_leave'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Nghỉ phép / Day Off</span>
              </button>

              <button
                type="button"
                onClick={() => onSetDayStatus(dateIso, 'sick_leave')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  currentStatus === 'sick_leave'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <span>Nghỉ ốm</span>
              </button>
            </div>
          </div>

          {/* Daily 8h Hours Counter */}
          <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
            <div className="text-right">
              <div className="text-xs text-neutral-500 font-medium">Tổng giờ hôm nay</div>
              <div className="text-2xl font-black text-neutral-900 font-mono tabular-nums">
                {totalDayHours}h <span className="text-xs font-normal text-neutral-400">/ {targetDayHours}h</span>
              </div>
            </div>

            <div className="text-xs">
              {isOffDay ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg font-bold">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>Ngày nghỉ hợp lệ (0h) ✓</span>
                </span>
              ) : totalDayHours >= targetDayHours ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã đủ {targetDayHours}h ✓</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Còn thiếu {(targetDayHours - totalDayHours).toFixed(1)}h</span>
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Notice for Leave / Sick leave / Holiday days */}
      {isOffDay && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 shadow-2xs animate-in fade-in duration-200">
          <Coffee className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-950 uppercase tracking-wide">
              {statusCfg.label} - Không cần log thời gian làm việc
            </h4>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Hôm nay là ngày nghỉ phép / nghỉ ốm của bạn. Bạn không cần log giờ làm việc. Ngày nghỉ này sẽ tự động được ghi nhận vào báo cáo tuần trong mục <strong>"Your days off this week"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Task Form or Leave Card */}
      {isOffDay ? (
        <div className="bg-white border border-amber-200 rounded-xl p-8 text-center shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
            <Coffee className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {t.dayLog.leaveCardTitle}
            </h3>
            <p className="text-xs text-neutral-600 max-w-md mx-auto mt-1 leading-relaxed">
              {t.dayLog.leaveCardDesc}
            </p>
          </div>
        </div>
      ) : (
      <div className="bg-white border-2 border-neutral-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-700" />
            <span>{editingId ? 'Chỉnh sửa task' : 'Ghi nhận công việc đã hoàn thành hôm nay'}</span>
          </h3>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-neutral-500 hover:text-neutral-800 underline"
            >
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* Quick GitHub Search & URL Picker */}
          <div className="relative">
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Tìm nhanh Issue / PR trên GitHub hoặc dán URL
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Gõ #4809, Enable sentry, file_picker hoặc dán link PR https://github.com/..."
                value={searchQuery}
                onChange={(e) => handleSearchGitHub(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50/60"
              />
              <GitPullRequest className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {isSearchingGitHub && (
                <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* GitHub Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto divide-y divide-neutral-100">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectGitHubItem(item)}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-start gap-2.5 transition-colors"
                  >
                    <GitPullRequest className={`w-4 h-4 shrink-0 mt-0.5 ${item.isPullRequest ? 'text-purple-600' : 'text-emerald-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 truncate">
                        #{item.number} {item.title}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {item.repoName} · {item.state}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Row 1: Task Name, Project, Hours */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Tên công việc (Project/Task) *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Enable sentry in the user setting #4809"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-semibold"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Dự án
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white font-medium"
              >
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Thời gian làm (Giờ) *
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-20 px-2 py-2 text-sm font-black border border-neutral-300 rounded-lg text-center tabular-nums focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 4, 8].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(String(h))}
                      className="px-2 py-1.5 text-xs font-mono bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-800 font-bold"
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Link & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Link gắn kèm (PR / Issue URL / Task link)
              </label>
              <input
                type="url"
                placeholder="https://github.com/linagora/twake-mail/pull/4809"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Mô tả chi tiết công việc (Description of activities)
              </label>
              <input
                type="text"
                placeholder="VD: Đã tích hợp crash reporting, kiểm thử trên Android..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Row 3: Completion % & Gap details */}
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800">
                Tiến độ hoàn thành task (Result vs Plan)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 font-medium">Hoàn thành:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={completionPct}
                  onChange={(e) => setCompletionPct(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs text-right font-black border border-neutral-300 rounded bg-white tabular-nums"
                />
                <span className="text-xs font-bold text-neutral-700">%</span>
                {completionPct < 100 && (
                  <span className="text-xs text-amber-700 font-bold ml-2">
                    (Gap: {100 - completionPct}%)
                  </span>
                )}
              </div>
            </div>

            {/* Gap details appear if completion < 100% */}
            {completionPct < 100 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Lý do chưa xong (Reason) *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: As for the final part (Part 3), it is currently awaiting review..."
                    value={gapReason}
                    onChange={(e) => setGapReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Giải pháp & Hạn chót (Solution/Deadline) *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Waiting review and merge next Monday"
                    value={gapSolution}
                    onChange={(e) => setGapSolution(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Remark & Submit button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex-1 sm:max-w-md">
              <input
                type="text"
                placeholder="Nhận xét / Remark bổ sung (nếu có)..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              {editingId ? 'Cập nhật task' : '+ Ghi nhận task hôm nay'}
            </button>
          </div>

        </form>
      </div>
      )}

      {/* List of Tasks Logged for This Day */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Các task đã log trong ngày ({dayEntries.length} task · Tổng {totalDayHours} tiếng)
          </div>
        </div>

        {dayEntries.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-xs italic">
            Chưa có công việc nào được ghi nhận cho ngày này. Hãy điền form ở trên để thêm task trước khi ra về.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {dayEntries.map((task) => (
              <div
                key={task.id}
                className="p-4 hover:bg-neutral-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-neutral-900">
                      {task.taskName}
                    </span>

                    <span className="text-xs font-medium text-neutral-500">
                      · {task.project}
                    </span>

                    {task.githubUrl && (
                      <a
                        href={task.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Link</span>
                      </a>
                    )}

                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                      {task.completionPct}% {task.gapPct > 0 && `(Gap: ${task.gapPct}%)`}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-neutral-600 mt-1">
                      {task.description}
                    </p>
                  )}

                  {task.gapReason && (
                    <p className="text-xs text-amber-800 mt-0.5 italic">
                      Lý do: {task.gapReason} {task.gapSolution && `· Solution: ${task.gapSolution}`}
                    </p>
                  )}

                  {task.remark && (
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Remark: {task.remark}
                    </p>
                  )}
                </div>

                {/* Right: Hours and action buttons */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
                  <div className="text-right">
                    <span className="font-mono text-base font-black text-neutral-900 tabular-nums">
                      {task.hours}h
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(task)}
                      title="Sửa task"
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Xóa task "${task.taskName}"?`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      title="Xóa task"
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
