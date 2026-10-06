import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink,
  Edit2,
  Plus,
  Trash2,
  Table,
  Building2,
  Home,
  Coffee,
  RotateCcw,
  HelpCircle,
  FileSpreadsheet,
  FileDown,
  Upload,
  X,
  FileCode
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TimeEntry, DayLog, UserSettings, WeeklyObjective, WeeklyReflections, DayStatusType } from '../types';
import { 
  getWeekDays, 
  formatDateIso, 
  formatShortDate, 
  getWeekNumber,
  getVietnameseDayName
} from '../utils/dateUtils';
import { 
  aggregateWeeklyTasks, 
  getWorkingAndOffDaysInfo, 
  exportWeeklyTemplateCsv, 
  exportRawNotionCsv 
} from '../utils/exportUtils';
import { 
  exportToStyledExcel, 
  exportToStyledOds, 
  copyFullReportToClipboard,
  buildReportExportContent
} from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';
import { getTranslations } from '../utils/i18n';

interface WeeklyReportViewProps {
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onResetToCurrentWeek: () => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  objectives: WeeklyObjective[];
  setObjectives: React.Dispatch<React.SetStateAction<WeeklyObjective[]>>;
  reflections: WeeklyReflections;
  setReflections: React.Dispatch<React.SetStateAction<WeeklyReflections>>;
  onUpdateDayStatus: (dateIso: string, status: DayStatusType) => void;
  onResetWeekToDefault: (weekDays: Date[]) => void;
  onUpdateEntry?: (entry: TimeEntry) => void;
}

interface UploadedTemplateInfo {
  fileName: string;
  sheetName: string;
  rowCount: number;
  colCount: number;
  mergesCount: number;
  mergesList: string[];
  sampleRows: (string | number)[][];
  generatedMarkdown: string;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  currentDate,
  onPrevWeek,
  onNextWeek,
  onResetToCurrentWeek,
  entries,
  dayLogs,
  settings,
  objectives,
  setObjectives,
  reflections,
  setReflections,
  onUpdateDayStatus,
  onResetWeekToDefault,
  onUpdateEntry,
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isEditingObjectives, setIsEditingObjectives] = useState(false);
  const [isEditingTaskGaps, setIsEditingTaskGaps] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<'instructions' | 'raw_code'>('instructions');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [uploadedTemplate, setUploadedTemplate] = useState<UploadedTemplateInfo | null>(null);

  const reportContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weekDays = getWeekDays(currentDate);
  const weekIsoDates = weekDays.map((d) => formatDateIso(d));
  const weekEntries = entries.filter((e) => weekIsoDates.includes(e.date));

  // Aggregate duplicate tasks and sum hours (identical to Google App Script)
  const aggregatedTasks = aggregateWeeklyTasks(weekEntries);
  const totalHours = aggregatedTasks.reduce((acc, curr) => acc + curr.hours, 0);

  // Office days and Days off
  const workingInfo = getWorkingAndOffDaysInfo(weekDays, dayLogs, settings);

  const weekNum = getWeekNumber(weekDays[0]);
  const startStr = formatShortDate(weekDays[0]);
  const endStr = formatShortDate(weekDays[4]); // Friday

  const lang = settings.language || 'vi';
  const t = getTranslations(lang);
  const r = t.report;

  // Handle uploaded template file
  const handleUploadTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rawAoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

      const merges = ws['!merges'] || [];
      const mergesList = merges.map((m) => {
        const startCol = XLSX.utils.encode_col(m.s.c);
        const endCol = XLSX.utils.encode_col(m.e.c);
        return `${startCol}${m.s.r + 1}:${endCol}${m.e.r + 1}`;
      });

      // Build a markdown representation for the user to copy/send
      const mdLines: string[] = [];
      mdLines.push(`### File Template: ${file.name} (Sheet: "${firstSheetName}")`);
      mdLines.push(`- Kích thước: ${rawAoa.length} dòng, ${rawAoa[0]?.length || 0} cột`);
      mdLines.push(`- Ô Merge phát hiện (${merges.length}): ${mergesList.slice(0, 15).join(', ')}`);
      mdLines.push('\n| ' + (rawAoa[0] || []).map((_, i) => XLSX.utils.encode_col(i)).join(' | ') + ' |');
      mdLines.push('| ' + (rawAoa[0] || []).map(() => '---').join(' | ') + ' |');
      rawAoa.slice(0, 20).forEach((row) => {
        mdLines.push('| ' + row.map((c) => String(c || '').replace(/\|/g, '-')).join(' | ') + ' |');
      });

      setUploadedTemplate({
        fileName: file.name,
        sheetName: firstSheetName,
        rowCount: rawAoa.length,
        colCount: rawAoa[0]?.length || 0,
        mergesCount: merges.length,
        mergesList,
        sampleRows: rawAoa.slice(0, 30),
        generatedMarkdown: mdLines.join('\n'),
      });

      setCopyFeedback(`Đã tải lên và đọc thành công file template "${file.name}"!`);
      setTimeout(() => setCopyFeedback(null), 6000);
    } catch (err) {
      console.error('Lỗi đọc file template', err);
      alert('Không thể đọc file template. Vui lòng kiểm tra file .xlsx hoặc .ods.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Copy full formatted report to clipboard
  const handleCopyFullReport = async () => {
    try {
      const res = await copyFullReportToClipboard(
        weekDays,
        entries,
        dayLogs,
        settings,
        objectives,
        reflections
      );
      if (res.success) {
        if (res.richCopied) {
          setCopyFeedback(
            '✅ Đã copy toàn bộ báo cáo đúng format (màu tím, merge ô, viền bảng và hyperlink)! Hãy mở một sheet trong Excel, ODS hoặc Google Sheets, chọn ô A1 rồi bấm Ctrl+V (hoặc Cmd+V).'
          );
        } else {
          setCopyFeedback(
            '✅ Đã copy dữ liệu bảng tuần dạng TSV. Mở một sheet trong Excel/ODS/Google Sheets và dán (Ctrl+V) vào ô A1.'
          );
        }
      } else {
        alert('Không thể truy cập clipboard của trình duyệt.');
      }
      setTimeout(() => setCopyFeedback(null), 8000);
    } catch (e) {
      console.error(e);
      alert('Lỗi sao chép vào bộ nhớ tạm.');
    }
  };

  // Export styled Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      await exportToStyledExcel(weekDays, entries, dayLogs, settings, objectives, reflections);
    } catch (e) {
      console.error(e);
      alert('Lỗi xuất file Excel.');
    }
  };

  // Export OpenDocument Spreadsheet (.ods)
  const handleExportOds = () => {
    try {
      exportToStyledOds(weekDays, entries, dayLogs, settings, objectives, reflections);
    } catch (e) {
      console.error(e);
      alert('Lỗi xuất file ODS.');
    }
  };

  // Direct client-side PDF export (works 100% reliably in sandboxed iframes)
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportReportToPdf(
        weekDays,
        entries,
        dayLogs,
        settings,
        objectives,
        reflections,
        `Weekly_Report_Week_${weekNum}_${settings.userName.replace(/\s+/g, '_')}.pdf`
      );
      setCopyFeedback(
        settings.language === 'fr'
          ? '✅ Rapport PDF exporté avec succès !'
          : settings.language === 'en'
          ? '✅ PDF report exported successfully!'
          : '✅ Đã xuất file PDF báo cáo tuần thành công!'
      );
      setTimeout(() => setCopyFeedback(null), 6000);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Không thể xuất file PDF. Vui lòng thử lại.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportTemplateCsv = () => {
    exportWeeklyTemplateCsv(weekDays, entries, dayLogs, settings, objectives, reflections);
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('window.print failed inside sandbox, downloading PDF instead', e);
      handleExportPdf();
    }
  };

  const handleAddObjective = () => {
    const newObj: WeeklyObjective = {
      id: `obj-${Date.now()}`,
      task: '',
      note: '',
    };
    setObjectives([...objectives, newObj]);
  };

  const handleUpdateObjective = (id: string, field: 'task' | 'note', val: string) => {
    setObjectives(objectives.map((o) => (o.id === id ? { ...o, [field]: val } : o)));
  };

  const handleDeleteObjective = (id: string) => {
    setObjectives(objectives.filter((o) => o.id !== id));
  };

  // Update task gap details if onUpdateEntry exists
  const handleQuickUpdateTask = (
    taskKey: string,
    field: 'completionPct' | 'gapReason' | 'gapSolution' | 'remark',
    val: string | number
  ) => {
    if (!onUpdateEntry) return;
    const matchingEntries = weekEntries.filter((e) => {
      const k = (e.taskName || '')
        .replace(/\(https?:\/\/[^)]*\)/gi, '')
        .replace(/\([^)]*\)/g, '')
        .trim()
        .toLowerCase();
      return k === taskKey;
    });

    matchingEntries.forEach((entry) => {
      if (field === 'completionPct') {
        const num = Number(val);
        onUpdateEntry({ ...entry, completionPct: isNaN(num) ? 100 : num });
      } else if (field === 'gapReason') {
        onUpdateEntry({ ...entry, gapReason: String(val) });
      } else if (field === 'gapSolution') {
        onUpdateEntry({ ...entry, gapSolution: String(val) });
      } else if (field === 'remark') {
        onUpdateEntry({ ...entry, notes: String(val) });
      }
    });
  };

  const exportContent = buildReportExportContent(
    weekDays,
    entries,
    dayLogs,
    settings,
    objectives,
    reflections
  );

  return (
    <div className="space-y-6">
      
      {/* Hidden file input for uploading company template */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.ods,.csv"
        onChange={handleUploadTemplateFile}
        className="hidden"
      />

      {/* Top Controls & Action Bar */}
      <div className="no-print flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              {r.title}
            </h2>
            <button
              onClick={() => setShowGuideModal(true)}
              className="text-neutral-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title="Xem hướng dẫn xuất & dán vào Excel/ODS"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t.actions.pasteGuide}</span>
            </button>
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            {r.subtitle}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week picker */}
          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={onPrevWeek}
              title={t.actions.prevWeek}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-neutral-800 tabular-nums">
              {r.weekFromTo(weekNum, startStr, endStr)}
            </span>
            <button
              onClick={onNextWeek}
              title={t.actions.nextWeek}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action 1: Export styled Excel (.xlsx) */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Tải về file Excel (.xlsx) đúng format màu tím, merge ô, viền và hyperlink"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.actions.exportExcel}</span>
          </button>

          {/* Action 2: Export ODS (.ods) */}
          <button
            onClick={handleExportOds}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Tải về file ODS (.ods) cho LibreOffice Calc, OpenOffice hoặc Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t.actions.exportOds}</span>
          </button>

          {/* Action 3: Export PDF (.pdf) */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Tải về file PDF khổ ngang A4 chất lượng cao"
          >
            {isExportingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang tạo PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>{t.actions.exportPdf}</span>
              </>
            )}
          </button>

          {/* Action 4: Copy full report with formatting to clipboard */}
          <button
            onClick={handleCopyFullReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Copy toàn bộ báo cáo đúng format để dán (Ctrl+V) vào một sheet trong Excel, ODS hoặc Google Sheets"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t.actions.copyToSheet}</span>
          </button>

          {/* Upload template file button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Tải file mẫu Excel (.xlsx) hoặc ODS (.ods) của bạn lên để xem và phân tích cấu trúc"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-600" />
            <span>{t.actions.uploadTemplate}</span>
          </button>

          {/* Export template CSV */}
          <button
            onClick={handleExportTemplateCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Xuất file CSV"
          >
            <Table className="w-3.5 h-3.5 text-neutral-600" />
            <span>{t.actions.exportCsv}</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Mở hộp thoại in trình duyệt"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.actions.print}</span>
          </button>
        </div>
      </div>

      {/* Copy notification banner */}
      {copyFeedback && (
        <div className="no-print p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-medium rounded-xl flex items-start justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">{copyFeedback}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Mẹo: Trong Excel / LibreOffice Calc / Google Sheets, chỉ cần tạo 1 Sheet mới, nhấp chuột vào ô <strong>A1</strong> rồi ấn <strong>Ctrl + V</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCopyFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Uploaded Template Analysis Card */}
      {uploadedTemplate && (
        <div className="no-print bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  Đã tải file template: {uploadedTemplate.fileName} (Sheet: "{uploadedTemplate.sheetName}")
                </h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Phát hiện: {uploadedTemplate.rowCount} dòng, {uploadedTemplate.colCount} cột, {uploadedTemplate.mergesCount} dải ô merge ({uploadedTemplate.mergesList.slice(0, 8).join(', ')}...)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(uploadedTemplate.generatedMarkdown);
                  alert('Đã copy cấu trúc template! Bạn có thể dán (Ctrl+V) vào khung chat này để AI tinh chỉnh chính xác 100%.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy cấu trúc gửi vào Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadedTemplate(null)}
                className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekend Review: Office Days & Days Off Quick Updater (No-print) */}
      <div className="no-print bg-white border border-neutral-300 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              Cập nhật ngày lên văn phòng & ngày off trong tuần
            </h3>
            <p className="text-[11px] text-neutral-500">
              Chọn nhanh trạng thái cho từng ngày từ Thứ 2 đến Thứ 6. Tự động tính số ngày văn phòng và số ngày nghỉ vào tiêu đề báo cáo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onResetWeekToDefault(weekDays)}
            className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 font-medium cursor-pointer"
            title="Khôi phục ngày lên văn phòng theo mặc định (Thứ 2, Thứ 3, Thứ 5)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Dùng ngày mặc định</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-3">
          {weekDays.slice(0, 5).map((d) => {
            const iso = formatDateIso(d);
            const dayLog = dayLogs[iso];
            const dayNum = d.getDay();
            const isDefaultOffice = settings.defaultOfficeDays.includes(dayNum);
            const currentStatus: DayStatusType = dayLog
              ? dayLog.status
              : isDefaultOffice
              ? 'work'
              : 'wfh';

            const dayName = getVietnameseDayName(d);
            const shortDate = formatShortDate(d);

            return (
              <div
                key={iso}
                className={`p-2.5 rounded-lg border text-xs transition-colors ${
                  currentStatus === 'work'
                    ? 'bg-purple-50/70 border-purple-200'
                    : currentStatus === 'wfh'
                    ? 'bg-sky-50/70 border-sky-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-neutral-800 mb-1.5">
                  <span>{dayName}</span>
                  <span className="font-mono text-[11px] text-neutral-500">{shortDate}</span>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateDayStatus(iso, 'work')}
                    className={`py-1 px-1 text-[11px] font-semibold rounded text-center transition-colors cursor-pointer ${
                      currentStatus === 'work'
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                    title="Làm việc tại văn phòng"
                  >
                    Office
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateDayStatus(iso, 'wfh')}
                    className={`py-1 px-1 text-[11px] font-semibold rounded text-center transition-colors cursor-pointer ${
                      currentStatus === 'wfh'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                    title="Làm việc tại nhà (WFH)"
                  >
                    WFH
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateDayStatus(iso, 'paid_leave')}
                    className={`py-1 px-1 text-[11px] font-semibold rounded text-center transition-colors cursor-pointer ${
                      currentStatus === 'paid_leave' || currentStatus === 'sick_leave' || currentStatus === 'holiday'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                    title="Nghỉ phép / Nghỉ ốm / Nghỉ lễ"
                  >
                    Off
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The Exact Linagora Vietnam Weekly Report Sheet Template (Screen 2) */}
      <div className="bg-white border-2 border-neutral-300 rounded-xl p-4 sm:p-6 shadow-sm overflow-x-auto text-neutral-900 font-sans">
        <div ref={reportContentRef} className="min-w-[960px] bg-white p-2">
          
          {/* Header Block */}
          <div className="border border-neutral-300 pb-3 mb-2">
            
            {/* Top row: Logo + Title */}
            <div className="grid grid-cols-12 items-center p-3 border-b border-neutral-300">
              <div className="col-span-3">
                <div className="inline-block">
                  <div className="text-xl font-black text-rose-700 tracking-tight leading-none">
                    LINAGORA
                  </div>
                  <div className="text-[11px] font-bold text-rose-700 tracking-widest pl-4">
                    Vietnam
                  </div>
                  <div className="h-0.5 bg-rose-600 mt-0.5" />
                </div>
              </div>

              <div className="col-span-6 text-center">
                <div className="text-base font-extrabold uppercase tracking-wide text-neutral-950">
                  WEEKLY REPORT
                </div>
                <div className="text-sm font-bold text-neutral-800 mt-0.5">
                  Week {weekNum} from {startStr} to {endStr}
                </div>
              </div>

              <div className="col-span-3 text-right text-xs font-semibold text-neutral-500">
                Tổng giờ: <span className="text-neutral-950 font-bold text-sm">{totalHours}h</span> / 40h
              </div>
            </div>

            {/* Row 2: Employee Name and Title */}
            <div className="px-4 py-1.5 border-b border-neutral-200 text-xs font-medium flex items-center justify-between">
              <div>
                Employee’s name: <strong className="text-neutral-950">{settings.userName}</strong>
              </div>
              <div>
                Title: <strong className="text-neutral-950">{settings.userRole}</strong>
              </div>
            </div>

            {/* Row 3: Days off */}
            <div className="px-4 py-1.5 border-b border-neutral-200 text-xs flex items-center justify-between">
              <span className="font-semibold text-neutral-800">Your days off this week:</span>
              <span className="text-neutral-700 font-mono font-medium">
                Number: {workingInfo.daysOffCount} Date: {workingInfo.daysOffDatesText || ''}
              </span>
            </div>

            {/* Row 4: Working days at the office */}
            <div className="px-4 py-1.5 text-xs flex items-center justify-between">
              <span className="font-semibold text-neutral-800">Your working days at the office this week:</span>
              <span className="text-neutral-700 font-mono font-medium">
                Number {workingInfo.officeDaysCount} Date: {workingInfo.officeDatesText || ''}
              </span>
            </div>
          </div>

          {/* Purple Section Banner: COMPLETED WORK */}
          <div className="bg-[#5023E6] text-white text-xs font-black tracking-wider uppercase text-center py-2 border border-[#4319C7] flex items-center justify-between px-4">
            <span className="w-16"></span>
            <span>{r.completedWorkHeader}</span>
            <div className="no-print">
              <button
                onClick={() => setIsEditingTaskGaps(!isEditingTaskGaps)}
                className="text-xs text-purple-200 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                title="Bật/tắt chế độ sửa nhanh % hoàn thành, lý do, solution và remark trên từng task"
              >
                <Edit2 className="w-3 h-3" />
                <span>{isEditingTaskGaps ? t.actions.save : t.actions.quickEditTasks}</span>
              </button>
            </div>
          </div>

          {/* Completed Work Table */}
          <table className="w-full border-collapse border border-neutral-300 text-xs">
            <thead>
              <tr className="bg-[#D9D2E9] text-neutral-900 font-bold text-[11px] uppercase border-b border-neutral-300">
                <th rowSpan={2} className="border border-neutral-300 py-2 px-1 text-center w-10">{r.colNo}</th>
                <th rowSpan={2} className="border border-neutral-300 py-2 px-3 text-left w-72">{r.colProject}</th>
                <th rowSpan={2} className="border border-neutral-300 py-2 px-3 text-center w-28">{r.colDesc}</th>
                <th rowSpan={2} className="border border-neutral-300 py-2 px-2 text-center w-20">{r.colTime}</th>
                <th colSpan={2} className="border border-neutral-300 py-1 px-2 text-center">{r.colResult}</th>
                <th colSpan={2} className="border border-neutral-300 py-1 px-2 text-center">{r.colGap}</th>
                <th rowSpan={2} className="border border-neutral-300 py-2 px-2 text-left w-36">{r.colRemark}</th>
              </tr>
              <tr className="bg-[#D9D2E9] text-neutral-800 font-bold text-[10px] uppercase border-b border-neutral-300">
                <th className="border border-neutral-300 py-1 px-1 text-center w-24">{r.colCompletion}</th>
                <th className="border border-neutral-300 py-1 px-1 text-center w-16">{r.colGapPct}</th>
                <th className="border border-neutral-300 py-1 px-2 text-left w-48">{r.colReason}</th>
                <th className="border border-neutral-300 py-1 px-2 text-left w-36">{r.colSolution}</th>
              </tr>
            </thead>

            <tbody>
              {aggregatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-400 italic">
                    Chưa có công việc nào trong tuần này. Hãy chuyển sang tab "Nhật ký cuối ngày" để thêm task.
                  </td>
                </tr>
              ) : (
                aggregatedTasks.map((task, idx) => (
                  <tr key={task.key} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="border border-neutral-300 py-2 px-1 text-center font-mono font-medium">
                      {idx + 1}
                    </td>
                    <td className="border border-neutral-300 py-2 px-3 font-semibold text-neutral-900">
                      {task.label}
                    </td>
                    <td className="border border-neutral-300 py-2 px-3 text-center">
                      {task.url ? (
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-semibold underline inline-flex items-center gap-1"
                        >
                          <span>Link</span>
                          <ExternalLink className="w-3 h-3 no-print" />
                        </a>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="border border-neutral-300 py-2 px-2 text-center font-mono font-bold text-neutral-900 tabular-nums">
                      {task.hours}h
                    </td>
                    <td className="border border-neutral-300 py-2 px-1 text-center font-mono tabular-nums">
                      {isEditingTaskGaps ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={task.completionPct}
                          onChange={(e) => handleQuickUpdateTask(task.key, 'completionPct', e.target.value)}
                          className="w-16 border border-neutral-300 rounded px-1 py-0.5 text-center text-xs"
                        />
                      ) : (
                        `${task.completionPct.toFixed(2)}%`
                      )}
                    </td>
                    <td className="border border-neutral-300 py-2 px-1 text-center font-mono tabular-nums text-neutral-600">
                      {task.gapPct > 0 ? `${task.gapPct.toFixed(2)}%` : ''}
                    </td>
                    <td className="border border-neutral-300 py-2 px-2 text-neutral-700 text-[11px]">
                      {isEditingTaskGaps ? (
                        <input
                          type="text"
                          value={task.gapReason}
                          onChange={(e) => handleQuickUpdateTask(task.key, 'gapReason', e.target.value)}
                          placeholder="Lý do..."
                          className="w-full border border-neutral-300 rounded px-1 py-0.5 text-xs"
                        />
                      ) : (
                        task.gapReason || '-'
                      )}
                    </td>
                    <td className="border border-neutral-300 py-2 px-2 text-neutral-700 text-[11px]">
                      {isEditingTaskGaps ? (
                        <input
                          type="text"
                          value={task.gapSolution}
                          onChange={(e) => handleQuickUpdateTask(task.key, 'gapSolution', e.target.value)}
                          placeholder="Solution..."
                          className="w-full border border-neutral-300 rounded px-1 py-0.5 text-xs"
                        />
                      ) : (
                        task.gapSolution || '-'
                      )}
                    </td>
                    <td className="border border-neutral-300 py-2 px-2 text-neutral-600 text-[11px]">
                      {isEditingTaskGaps ? (
                        <input
                          type="text"
                          value={task.remark}
                          onChange={(e) => handleQuickUpdateTask(task.key, 'remark', e.target.value)}
                          placeholder="Remark..."
                          className="w-full border border-neutral-300 rounded px-1 py-0.5 text-xs"
                        />
                      ) : (
                        task.remark || '-'
                      )}
                    </td>
                  </tr>
                ))
              )}

              {/* Extra placeholder rows for template look */}
              {Array.from({ length: Math.max(0, 8 - aggregatedTasks.length) }).map((_, i) => (
                <tr key={`blank-${i}`} className="h-7">
                  <td className="border border-neutral-200 text-center text-neutral-300 font-mono text-[10px]">
                    {aggregatedTasks.length + i + 1}
                  </td>
                  <td className="border border-neutral-200"></td>
                  <td className="border border-neutral-200"></td>
                  <td className="border border-neutral-200"></td>
                  <td className="border border-neutral-200"></td>
                  <td className="border border-neutral-200"></td>
                  <td className="border border-neutral-200"></td>
                  <td className="border border-neutral-200"></td>
                  <td className="border border-neutral-200"></td>
                </tr>
              ))}

              {/* Review/Meeting separator row (Row 31 in template) */}
              <tr className="bg-neutral-50/50 text-neutral-500 italic text-[11px]">
                <td className="border border-neutral-300 py-1 text-center font-mono">…</td>
                <td colSpan={8} className="border border-neutral-300 py-1.5 px-3">
                  Reviews, meetings, support, community, …
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bottom Section: OBJECTIVE FOR NEXT WEEK (Left) & REFLECTIONS (Right) */}
          <div className="grid grid-cols-12 border border-neutral-300 mt-3">
            
            {/* Left 6 cols: Objective for next week */}
            <div className="col-span-6 border-r border-neutral-300 p-2">
              <div className="bg-[#5023E6] text-white text-[11px] font-bold uppercase py-1.5 px-3 flex items-center justify-between">
                <span>{r.objTitle}</span>
                <button
                  onClick={() => setIsEditingObjectives(!isEditingObjectives)}
                  className="no-print text-xs text-purple-200 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingObjectives ? t.actions.save : t.actions.edit}</span>
                </button>
              </div>

              <table className="w-full border-collapse border border-neutral-300 text-xs mt-1">
                <thead>
                  <tr className="bg-neutral-100 font-semibold border-b border-neutral-300 text-[10px]">
                    <th className="border border-neutral-300 py-1 px-1 text-center w-8">{r.objNo}</th>
                    <th className="border border-neutral-300 py-1 px-2 text-left">{r.objTitle}</th>
                    <th className="border border-neutral-300 py-1 px-2 text-left w-28">{r.objNote}</th>
                    {isEditingObjectives && <th className="no-print border border-neutral-300 py-1 px-1 w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {objectives.map((obj, idx) => (
                    <tr key={obj.id} className="border-b border-neutral-200">
                      <td className="border border-neutral-300 py-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-neutral-300 py-1 px-2 font-medium">
                        {isEditingObjectives ? (
                          <input
                            type="text"
                            value={obj.task}
                            onChange={(e) => handleUpdateObjective(obj.id, 'task', e.target.value)}
                            className="w-full border border-neutral-300 rounded px-1 py-0.5 text-xs"
                          />
                        ) : (
                          obj.task || '-'
                        )}
                      </td>
                      <td className="border border-neutral-300 py-1 px-2 text-neutral-600">
                        {isEditingObjectives ? (
                          <input
                            type="text"
                            value={obj.note}
                            onChange={(e) => handleUpdateObjective(obj.id, 'note', e.target.value)}
                            className="w-full border border-neutral-300 rounded px-1 py-0.5 text-xs"
                          />
                        ) : (
                          obj.note || '-'
                        )}
                      </td>
                      {isEditingObjectives && (
                        <td className="no-print border border-neutral-300 py-1 px-1 text-center">
                          <button
                            onClick={() => handleDeleteObjective(obj.id)}
                            className="text-rose-600 hover:text-rose-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 5 - objectives.length) }).map((_, i) => (
                    <tr key={`blank-obj-${i}`} className="h-6">
                      <td className="border border-neutral-200 text-center text-neutral-300 font-mono text-[10px]">
                        {objectives.length + i + 1}
                      </td>
                      <td className="border border-neutral-200"></td>
                      <td className="border border-neutral-200"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isEditingObjectives && (
                <div className="no-print pt-2">
                  <button
                    onClick={handleAddObjective}
                    className="flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm mục tiêu tuần tới</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right 6 cols: Reflections */}
            <div className="col-span-6 p-2 space-y-2 text-xs">
              <div className="bg-[#D9D2E9] text-neutral-900 font-bold p-1.5 border border-neutral-300 italic">
                {r.refWentWellTitle}
              </div>
              <textarea
                rows={2}
                value={reflections.wentWell}
                onChange={(e) => setReflections({ ...reflections, wentWell: e.target.value })}
                placeholder="..."
                className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-700"
              />

              <div className="bg-[#D9D2E9] text-neutral-900 font-bold p-1.5 border border-neutral-300 italic">
                {r.refChallengingTitle}
              </div>
              <textarea
                rows={2}
                value={reflections.challenging}
                onChange={(e) => setReflections({ ...reflections, challenging: e.target.value })}
                placeholder="..."
                className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-700"
              />

              <div className="bg-[#D9D2E9] text-neutral-900 font-bold p-1.5 border border-neutral-300 italic">
                {r.refProposalTitle}
              </div>
              <textarea
                rows={2}
                value={reflections.proposal}
                onChange={(e) => setReflections({ ...reflections, proposal: e.target.value })}
                placeholder="..."
                className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-12 text-center text-xs font-bold pt-8 pb-4">
            <div className="col-span-5">
              <div>{r.sigEmployee}</div>
              <div className="mt-8 text-neutral-600 font-normal">{settings.userName}</div>
            </div>
            <div className="col-span-2"></div>
            <div className="col-span-5">
              <div>{r.sigManager}</div>
              <div className="mt-8 text-neutral-400 font-normal">........................................</div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Modal: How to Paste into Excel / ODS / Google Sheets */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Hướng Dẫn Xuất & Dán Vào Excel / ODS / Google Sheets / PDF
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Các cách để có file báo cáo tuần chuẩn format
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 flex border-b border-neutral-200 gap-4 text-xs font-semibold">
              <button
                onClick={() => setGuideTab('instructions')}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                  guideTab === 'instructions'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                1. Cách Dán (Ctrl + V)
              </button>
              <button
                onClick={() => setGuideTab('raw_code')}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                  guideTab === 'raw_code'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                2. Xem & Copy Dữ Liệu
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-neutral-700">
              {guideTab === 'instructions' ? (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-indigo-950 text-sm">
                      Cách 1: Copy và dán trực tiếp vào Sheet (Khuyên Dùng)
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-indigo-900 font-medium leading-relaxed">
                      <li>
                        Nhấn nút <strong>"Copy dán vào Sheet"</strong> trên thanh công cụ.
                      </li>
                      <li>
                        Mở <strong>Microsoft Excel</strong>, <strong>LibreOffice Calc (ODS)</strong> hoặc <strong>Google Sheets</strong>.
                      </li>
                      <li>
                        Tạo một sheet mới (hoặc mở sheet hiện tại), nhấp chuột chọn <strong>ô A1</strong>.
                      </li>
                      <li>
                        Nhấn phím <strong>Ctrl + V</strong> (hoặc <strong>Cmd + V</strong> trên Mac). Toàn bộ banner tím, bảng header, merge ô, viền và các task sẽ hiển thị chuẩn 100%!
                      </li>
                    </ol>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Cách 2: Tải trực tiếp file .xlsx, .ods hoặc .pdf
                    </h4>
                    <p className="text-emerald-900">
                      Nếu không muốn copy dán thủ công, bạn chỉ cần bấm nút để tải file ngay:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          handleExportExcel();
                          setShowGuideModal(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải file Excel (.xlsx)</span>
                      </button>
                      <button
                        onClick={() => {
                          handleExportOds();
                          setShowGuideModal(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Tải file ODS (.ods)</span>
                      </button>
                      <button
                        onClick={() => {
                          handleExportPdf();
                          setShowGuideModal(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Tải file PDF (.pdf)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-bold text-neutral-800">Dữ liệu TSV (Tab-separated values):</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(exportContent.tsv);
                          alert('Đã copy dữ liệu TSV vào clipboard!');
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        Copy riêng TSV
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={8}
                      value={exportContent.tsv}
                      className="w-full font-mono text-[11px] p-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 select-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
              <button
                onClick={handleCopyFullReport}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer text-xs shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Ngay Báo Cáo</span>
              </button>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-medium rounded-lg cursor-pointer text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
