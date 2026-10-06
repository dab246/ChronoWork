import React, { useState, useRef } from 'react';
import { 
  X, 
  Settings, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2,
  Check,
  Building,
  Github
} from 'lucide-react';
import { UserSettings } from '../types';
import { 
  exportAllDataJson, 
  importAllDataJson, 
  generateSampleEntries, 
  generateSampleDayLogs, 
  saveStoredEntries, 
  saveStoredDayLogs
} from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onRefreshData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onRefreshData,
}) => {
  const [userName, setUserName] = useState(settings.userName);
  const [userRole, setUserRole] = useState(settings.userRole);
  const [companyName, setCompanyName] = useState(settings.companyName || 'LINAGORA Vietnam');
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(String(settings.weeklyTargetHours || 40));
  const [officeDays, setOfficeDays] = useState<number[]>(settings.officeWorkingDays || [1, 2, 4]);
  const [githubToken, setGithubToken] = useState(settings.githubToken || '');
  const [defaultRepos, setDefaultRepos] = useState(settings.defaultRepos.join(', '));
  const [soundEffects, setSoundEffects] = useState(settings.soundEffects ?? true);
  const [msg, setMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3000);
  };

  const toggleOfficeDay = (dayNum: number) => {
    if (officeDays.includes(dayNum)) {
      setOfficeDays(officeDays.filter((d) => d !== dayNum));
    } else {
      setOfficeDays([...officeDays, dayNum].sort());
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      userName: userName.trim() || 'Dat Vu',
      userRole: userRole.trim() || 'Mobile Engineer',
      companyName: companyName.trim() || 'LINAGORA Vietnam',
      weeklyTargetHours: parseFloat(weeklyTargetHours) || 40,
      dailyStandardHours: 8,
      defaultOfficeDays: officeDays,
      officeWorkingDays: officeDays,
      githubToken: githubToken.trim() || undefined,
      defaultRepos: defaultRepos
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      soundEffects,
    });
    showFeedback('Đã lưu cấu hình!');
    setTimeout(() => onClose(), 800);
  };

  const handleExportBackup = () => {
    const json = exportAllDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ChronoWork_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showFeedback('Đã tải xuống file sao lưu JSON!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importAllDataJson(content);
      if (success) {
        onRefreshData();
        showFeedback('Khôi phục dữ liệu thành công!');
      } else {
        alert('Lỗi: File JSON không đúng định dạng sao lưu!');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetToDemo = () => {
    if (confirm('Khôi phục dữ liệu mẫu từ template Linagora & Notion cho tuần này?')) {
      saveStoredEntries(generateSampleEntries());
      saveStoredDayLogs(generateSampleDayLogs());
      onRefreshData();
      showFeedback('Đã nạp lại dữ liệu mẫu tuần này!');
    }
  };

  const handleClearAll = () => {
    if (confirm('CẢNH BÁO: Xóa toàn bộ dữ liệu log time?')) {
      saveStoredEntries([]);
      saveStoredDayLogs({});
      onRefreshData();
      showFeedback('Đã dọn sạch dữ liệu!');
    }
  };

  const DAY_LABELS = [
    { num: 1, label: 'Thứ 2' },
    { num: 2, label: 'Thứ 3' },
    { num: 3, label: 'Thứ 4' },
    { num: 4, label: 'Thứ 5' },
    { num: 5, label: 'Thứ 6' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-neutral-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-neutral-800" />
            <h3 className="text-base font-bold text-neutral-900">
              Cài Đặt Cá Nhân & Mẫu Báo Cáo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message toast */}
        {msg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{msg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Section: Employee & Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-neutral-500" />
              <span>Thông Tin Nhân Viên & Công Ty</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Họ và tên (Employee’s name)
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Chức danh (Title)
                </label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Tên công ty
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Section: Office Working Days config */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Ngày làm việc tại văn phòng mặc định (Office Days):
            </label>
            <p className="text-[11px] text-neutral-500">
              Xuất vào dòng "Your working days at the office this week" trên báo cáo
            </p>
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {DAY_LABELS.map((d) => {
                const isSelected = officeDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleOfficeDay(d.num)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {d.label} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: GitHub Integration */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-neutral-700" />
              <span>Cấu Hình Tìm Kiếm GitHub</span>
            </h4>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Kho chứa GitHub mặc định (Repositories - phân cách bởi dấu phẩy)
              </label>
              <input
                type="text"
                value={defaultRepos}
                onChange={(e) => setDefaultRepos(e.target.value)}
                placeholder="linagora/twake-mail, linagora/tmail-flutter, linagora/twake"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                GitHub Token (Tùy chọn - để tăng giới hạn API rate limit hoặc repo private)
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
              />
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
            >
              Lưu Cấu Hình
            </button>
          </div>

          {/* Section: Backup & Restore */}
          <div className="space-y-3 pt-3 border-t border-neutral-100">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Sao Lưu & Dữ Liệu Mẫu
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sao lưu JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Khôi phục JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={handleResetToDemo}
                className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tải dữ liệu mẫu tuần này</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa sạch dữ liệu</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
