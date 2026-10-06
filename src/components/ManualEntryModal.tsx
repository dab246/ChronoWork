import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Folder, Tag, Trash2, GitPullRequest, Search, ExternalLink, Link2 } from 'lucide-react';
import { TimeEntry, TaskCategory, CATEGORY_LABELS, UserSettings } from '../types';
import { formatDateIso } from '../utils/dateUtils';
import { searchGitHubIssuesAndPRs, fetchGitHubDetailsByUrl, GitHubItem } from '../services/githubService';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<TimeEntry, 'id' | 'createdAt'>, editingId?: string) => void;
  onDelete?: (id: string) => void;
  editingEntry?: TimeEntry | null;
  projects: string[];
  defaultDate?: string;
  settings: UserSettings;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingEntry,
  projects,
  defaultDate,
  settings,
}) => {
  const [taskName, setTaskName] = useState('');
  const [project, setProject] = useState(projects[0] || 'Twake Mail');
  const [customProject, setCustomProject] = useState('');
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [category, setCategory] = useState<TaskCategory>('development');
  const [date, setDate] = useState(defaultDate || formatDateIso(new Date()));
  const [hours, setHours] = useState('4');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubNumber, setGithubNumber] = useState<number | undefined>(undefined);
  const [completionPct, setCompletionPct] = useState(100);
  const [gapReason, setGapReason] = useState('');
  const [gapSolution, setGapSolution] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // GitHub search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingGitHub, setIsSearchingGitHub] = useState(false);
  const [searchResults, setSearchResults] = useState<GitHubItem[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setTaskName(editingEntry.taskName);
      setProject(editingEntry.project);
      setIsCustomProject(!projects.includes(editingEntry.project));
      setCustomProject(!projects.includes(editingEntry.project) ? editingEntry.project : '');
      setCategory(editingEntry.category || 'development');
      setDate(editingEntry.date);
      setHours(String(editingEntry.hours ?? (editingEntry.durationMinutes ? editingEntry.durationMinutes / 60 : 4)));
      setGithubUrl(editingEntry.githubUrl || '');
      setGithubNumber(editingEntry.githubNumber);
      setCompletionPct(editingEntry.completionPct ?? 100);
      setGapReason(editingEntry.gapReason || '');
      setGapSolution(editingEntry.gapSolution || '');
      setNotes(editingEntry.notes || '');
    } else {
      setTaskName('');
      setProject(projects[0] || 'Twake Mail');
      setIsCustomProject(false);
      setCustomProject('');
      setCategory('development');
      setDate(defaultDate || formatDateIso(new Date()));
      setHours('4');
      setGithubUrl('');
      setGithubNumber(undefined);
      setCompletionPct(100);
      setGapReason('');
      setGapSolution('');
      setNotes('');
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setError('');
  }, [editingEntry, isOpen, defaultDate, projects]);

  if (!isOpen) return null;

  // Handle GitHub Search / URL Paste
  const handleSearchGitHub = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    // Direct GitHub URL detected
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
    setGithubNumber(item.number);
    if (item.repoName.includes('tmail')) {
      setProject('Tmail Flutter');
    } else if (item.repoName.includes('twake')) {
      setProject('Twake Mail');
    }
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) {
      setError('Vui lòng nhập tên công việc hoặc liên kết GitHub!');
      return;
    }

    const numHours = parseFloat(hours) || 0;
    if (numHours <= 0) {
      setError('Thời gian làm việc phải lớn hơn 0 giờ!');
      return;
    }

    const finalProject = isCustomProject && customProject.trim() ? customProject.trim() : project;

    onSave(
      {
        taskName: taskName.trim(),
        project: finalProject,
        category,
        date,
        hours: numHours,
        durationMinutes: Math.round(numHours * 60),
        githubUrl: githubUrl.trim() || undefined,
        githubNumber,
        completionPct,
        gapPct: Math.max(0, 100 - completionPct),
        gapReason: gapReason.trim() || undefined,
        gapSolution: gapSolution.trim() || undefined,
        notes: notes.trim() || undefined,
        isCompleted: true,
      },
      editingEntry?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-neutral-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-neutral-800" />
            <h3 className="text-base font-bold text-neutral-900">
              {editingEntry ? 'Chỉnh sửa Log Công Việc' : 'Ghi Nhận Log Task'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* GitHub Search / Link Bar */}
          <div className="relative">
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Liên kết GitHub Issue / PR (Tìm kiếm hoặc dán URL)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Dán link PR/Issue hoặc gõ #4809, Enable sentry, file_picker..."
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
                      <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                        <span>{item.repoName}</span>
                        <span>·</span>
                        <span className="capitalize">{item.state}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Task Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Tên công việc (Task) *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Enable sentry in the user setting #4809"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-medium"
            />
            {githubUrl && (
              <div className="flex items-center gap-1.5 text-xs text-sky-700 mt-1">
                <Link2 className="w-3.5 h-3.5" />
                <a href={githubUrl} target="_blank" rel="noreferrer" className="underline truncate max-w-sm">
                  {githubUrl}
                </a>
                <button
                  type="button"
                  onClick={() => { setGithubUrl(''); setGithubNumber(undefined); }}
                  className="text-neutral-400 hover:text-neutral-600 text-[10px] ml-1"
                >
                  (Xóa link)
                </button>
              </div>
            )}
          </div>

          {/* Project & Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Dự án
              </label>
              {!isCustomProject ? (
                <select
                  value={project}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setIsCustomProject(true);
                    } else {
                      setProject(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                >
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="__new__">+ Dự án mới chưa có trên GitHub...</option>
                </select>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Tên dự án mới..."
                    value={customProject}
                    onChange={(e) => setCustomProject(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomProject(false)}
                    className="px-2 py-1 text-xs border border-neutral-300 rounded-lg hover:bg-neutral-100"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Loại việc
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([catKey, val]) => (
                  <option key={catKey} value={catKey}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Hours row (Calculation in Hours: 1h, 2h, 4h, 8h) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Ngày thực hiện
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Thời gian (tính theo Giờ)
              </label>
              <div className="flex items-center border border-neutral-300 rounded-lg px-3 py-1.5 bg-white">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full text-sm font-bold focus:outline-none tabular-nums"
                />
                <span className="text-xs text-neutral-500 font-medium">tiếng</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 4, 8].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(String(h))}
                    className="px-2 py-0.5 text-[11px] font-mono bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700"
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Completion & Gap (For Linagora Template reporting) */}
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-700">Mức độ hoàn thành</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={completionPct}
                  onChange={(e) => setCompletionPct(Number(e.target.value))}
                  className="w-16 px-1.5 py-0.5 text-xs text-right border border-neutral-300 rounded font-bold tabular-nums"
                />
                <span className="text-xs text-neutral-600">%</span>
              </div>
            </div>

            {completionPct < 100 && (
              <div className="space-y-2 pt-1 border-t border-neutral-200 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                    Lý do còn Gap ({100 - completionPct}%):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: As for the final part, it is currently awaiting review..."
                    value={gapReason}
                    onChange={(e) => setGapReason(e.target.value)}
                    className="w-full px-2 py-1.5 border border-neutral-300 rounded bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                    Giải pháp / Deadline (Solution/Deadline):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Waiting review and merge next Monday"
                    value={gapSolution}
                    onChange={(e) => setGapSolution(e.target.value)}
                    className="w-full px-2 py-1.5 border border-neutral-300 rounded bg-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Ghi chú thêm (Notes / Remark)
            </label>
            <input
              type="text"
              placeholder="VD: Kiểm thử trên thiết bị thật, rebase branch..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
            {editingEntry && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn xóa log này?')) {
                    onDelete(editingEntry.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa log</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
              >
                {editingEntry ? 'Cập nhật' : 'Lưu công việc'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
