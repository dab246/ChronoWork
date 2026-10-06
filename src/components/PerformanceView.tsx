import React from 'react';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Award, 
  Flame, 
  AlertTriangle,
  Lightbulb,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TimeEntry, DayLog, UserSettings, DAY_STATUS_CONFIGS, CATEGORY_LABELS } from '../types';
import { 
  getWeekDays, 
  formatDateIso, 
  formatShortDate, 
  getVietnameseDayName, 
  getWeekRangeString, 
  minutesToHoursDecimal,
  isWeekendDay
} from '../utils/dateUtils';

interface PerformanceViewProps {
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onResetToCurrentWeek: () => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  currentDate,
  onPrevWeek,
  onNextWeek,
  onResetToCurrentWeek,
  entries,
  dayLogs,
  settings,
}) => {
  const weekDays = getWeekDays(currentDate);
  const weekIsoDates = weekDays.map((d) => formatDateIso(d));
  const weekEntries = entries.filter((e) => weekIsoDates.includes(e.date));

  const totalMinutes = weekEntries.reduce((acc, curr) => acc + (curr.hours ? curr.hours * 60 : (curr.durationMinutes || 0)), 0);
  const totalHours = minutesToHoursDecimal(totalMinutes);
  const targetHours = settings.weeklyTargetHours || 40;
  const targetPct = Math.round((totalHours / targetHours) * 100);

  // Focus level breakdown
  let deepMinutes = 0;
  let normalMinutes = 0;
  let shallowMinutes = 0;

  weekEntries.forEach((e) => {
    const mins = e.hours ? e.hours * 60 : (e.durationMinutes || 0);
    if (e.focusLevel === 'deep' || e.category === 'development' || e.category === 'security') {
      deepMinutes += mins;
    } else if (e.focusLevel === 'normal' || e.category === 'pr_review' || e.category === 'release') {
      normalMinutes += mins;
    } else {
      shallowMinutes += mins;
    }
  });

  const deepHours = minutesToHoursDecimal(deepMinutes);
  const deepPct = totalMinutes > 0 ? Math.round((deepMinutes / totalMinutes) * 100) : 0;
  const normalPct = totalMinutes > 0 ? Math.round((normalMinutes / totalMinutes) * 100) : 0;
  const shallowPct = totalMinutes > 0 ? Math.round((shallowMinutes / totalMinutes) * 100) : 0;

  // Meeting minutes
  const meetingMinutes = weekEntries
    .filter((e) => e.category === 'meeting')
    .reduce((acc, curr) => acc + (curr.hours ? curr.hours * 60 : (curr.durationMinutes || 0)), 0);
  const meetingPct = totalMinutes > 0 ? Math.round((meetingMinutes / totalMinutes) * 100) : 0;

  // Task completion
  const totalTasks = weekEntries.length;
  const completedTasks = weekEntries.filter((t) => t.completionPct === 100 || t.isCompleted).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Daily hours array for bar chart
  const dailyHours = weekIsoDates.map((iso) => {
    const dayEntries = weekEntries.filter((e) => e.date === iso);
    const mins = dayEntries.reduce((sum, e) => sum + (e.hours ? e.hours * 60 : (e.durationMinutes || 0)), 0);
    return minutesToHoursDecimal(mins);
  });

  const maxDailyHour = Math.max(...dailyHours, 8);

  // Insights generation
  const insights: { type: 'success' | 'info' | 'warning'; text: string }[] = [];

  if (targetPct >= 100) {
    insights.push({
      type: 'success',
      text: `Xuất sắc! Bạn đã đạt ${targetPct}% mục tiêu tuần (${totalHours}h / ${targetHours}h).`,
    });
  } else if (targetPct >= 80) {
    insights.push({
      type: 'info',
      text: `Tiến độ tốt: Bạn đã hoàn thành ${targetPct}% mục tiêu tuần. Cần thêm ${(targetHours - totalHours).toFixed(1)}h để cán mốc.`,
    });
  } else {
    insights.push({
      type: 'warning',
      text: `Tiến độ hiện tại đang đạt ${targetPct}% mục tiêu. Hãy kiểm tra các ngày chưa log đủ giờ.`,
    });
  }

  if (deepPct >= 50) {
    insights.push({
      type: 'success',
      text: `Chỉ số Deep Work rất cao (${deepPct}% thời lượng). Bạn đang duy trì mức độ tập trung sâu tuyệt vời cho các bài toán phức tạp!`,
    });
  } else if (deepPct < 30 && totalMinutes > 0) {
    insights.push({
      type: 'warning',
      text: `Tỷ lệ Deep Work chỉ đạt ${deepPct}%. Hãy cân nhắc xếp các khối thời gian (Time-blocking) không ngắt quãng để tập trung lập trình.`,
    });
  }

  if (meetingPct > 35) {
    insights.push({
      type: 'warning',
      text: `Thời lượng họp chiếm ${meetingPct}% tổng thời gian (${minutesToHoursDecimal(meetingMinutes)}h). Cân nhắc giảm bớt họp để có thêm thời gian code.`,
    });
  } else {
    insights.push({
      type: 'info',
      text: `Thời lượng họp chiếm ${meetingPct}%, ở mức cân bằng hợp lý để giải quyết các công việc kỹ thuật cốt lõi.`,
    });
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header & Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            Theo Dõi & Phân Tích Hiệu Suất Cá Nhân
          </h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Đo lường tiến độ mục tiêu, tỷ lệ tập trung sâu (Deep Work) và nhịp độ làm việc hàng ngày
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetToCurrentWeek}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Tuần này
          </button>
          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={onPrevWeek}
              title="Tuần trước"
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-neutral-800 tabular-nums">
              {getWeekRangeString(currentDate)}
            </span>
            <button
              onClick={onNextWeek}
              title="Tuần sau"
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Performance Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Goal Progress */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              <span>Đạt Mục Tiêu Tuần</span>
              <Target className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-950 font-mono tabular-nums">
                {targetPct}%
              </span>
              <span className="text-xs text-neutral-500">
                ({totalHours}h / {targetHours}h)
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  targetPct >= 100 ? 'bg-emerald-600' : 'bg-neutral-900'
                }`}
                style={{ width: `${Math.min(100, targetPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1.5">
              <span>0h</span>
              <span>Chuẩn: {targetHours}h</span>
            </div>
          </div>
        </div>

        {/* Card 2: Deep Work Ratio */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              <span>Tập Trung Sâu (Deep Work)</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-950 font-mono tabular-nums">
                {deepPct}%
              </span>
              <span className="text-xs text-neutral-500">
                ({deepHours}h tập trung cao)
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden flex">
              <div className="bg-indigo-600 h-full" style={{ width: `${deepPct}%` }} title={`Deep: ${deepPct}%`} />
              <div className="bg-neutral-400 h-full" style={{ width: `${normalPct}%` }} title={`Normal: ${normalPct}%`} />
              <div className="bg-neutral-200 h-full" style={{ width: `${shallowPct}%` }} title={`Shallow: ${shallowPct}%`} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1.5">
              <span className="text-indigo-600 font-medium">Deep: {deepPct}%</span>
              <span>Bình thường: {normalPct}%</span>
              <span>Họp/Nhẹ: {shallowPct}%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Task Completion */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              <span>Tỷ Lệ Hoàn Thành Task</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-950 font-mono tabular-nums">
                {taskCompletionRate}%
              </span>
              <span className="text-xs text-neutral-500">
                ({completedTasks} / {totalTasks} task)
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1.5">
              <span>Đang xử lý: {totalTasks - completedTasks}</span>
              <span className="text-emerald-700 font-medium">Đã xong: {completedTasks}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Visual Chart: Daily Hours Consistency (Mon - Sun) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Biểu Đồ Phân Bổ Giờ Làm Việc Từng Ngày
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              So sánh giờ làm thực tế mỗi ngày với mức chuẩn {settings.dailyStandardHours || 8}h/ngày
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-neutral-900"></span>
              <span>Giờ thực tế</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-neutral-400 border-t border-dashed border-neutral-600"></span>
              <span>Chuẩn 8h</span>
            </div>
          </div>
        </div>

        {/* SVG-based Bar Chart */}
        <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-neutral-200">
          {weekDays.map((day, idx) => {
            const iso = weekIsoDates[idx];
            const hours = dailyHours[idx];
            const isWk = isWeekendDay(day);
            const standard = isWk ? 0 : (settings.dailyStandardHours || 8);
            const heightPercent = maxDailyHour > 0 ? (hours / (maxDailyHour * 1.15)) * 100 : 0;
            const standardPercent = maxDailyHour > 0 ? (standard / (maxDailyHour * 1.15)) * 100 : 0;

            return (
              <div key={iso} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Tooltip on hover */}
                <div className="text-[11px] font-mono font-bold text-neutral-900 mb-1 opacity-80 group-hover:opacity-100 tabular-nums">
                  {hours > 0 ? `${hours}h` : '-'}
                </div>

                {/* Bar container */}
                <div className="relative w-full max-w-[48px] h-full flex items-end justify-center">
                  {/* Standard 8h benchmark line */}
                  {standard > 0 && (
                    <div
                      className="absolute w-full border-t border-dashed border-neutral-400 z-10 pointer-events-none"
                      style={{ bottom: `${standardPercent}%` }}
                      title="Mức chuẩn 8 giờ"
                    />
                  )}

                  {/* Actual Bar */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      hours >= 8
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : hours > 0
                        ? 'bg-neutral-800 hover:bg-neutral-900'
                        : 'bg-neutral-200/50'
                    }`}
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                  />
                </div>

                {/* Day label */}
                <div className="text-center mt-2">
                  <div className="text-xs font-semibold text-neutral-800">{getVietnameseDayName(day, true)}</div>
                  <div className="text-[10px] text-neutral-400 font-mono">{formatShortDate(day)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Gợi Ý Tối Ưu Năng Suất Cá Nhân</span>
        </h3>

        <div className="space-y-3">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
                item.type === 'success'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : item.type === 'warning'
                  ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-800'
              }`}
            >
              <Award className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
              <p className="leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
