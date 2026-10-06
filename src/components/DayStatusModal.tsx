import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { DayLog, DayStatusType, DAY_STATUS_CONFIGS } from '../types';
import { formatVietnameseDate, formatDateIso } from '../utils/dateUtils';

interface DayStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateIso: string;
  currentDayLog?: DayLog;
  onSaveDayLog: (log: DayLog) => void;
}

export const DayStatusModal: React.FC<DayStatusModalProps> = ({
  isOpen,
  onClose,
  dateIso,
  currentDayLog,
  onSaveDayLog,
}) => {
  const [status, setStatus] = useState<DayStatusType>('work');
  const [note, setNote] = useState('');
  const [targetHours, setTargetHours] = useState('8');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');

  useEffect(() => {
    if (currentDayLog) {
      setStatus(currentDayLog.status);
      setNote(currentDayLog.note || '');
      setTargetHours(String(currentDayLog.targetHours ?? 8));
      setCheckInTime(currentDayLog.checkInTime || '');
      setCheckOutTime(currentDayLog.checkOutTime || '');
    } else {
      const isWeekend = new Date(dateIso).getDay() === 0 || new Date(dateIso).getDay() === 6;
      const defaultStatus: DayStatusType = isWeekend ? 'weekend' : 'work';
      setStatus(defaultStatus);
      setNote('');
      setTargetHours(defaultStatus === 'weekend' ? '0' : '8');
      setCheckInTime(defaultStatus === 'work' ? '08:30' : '');
      setCheckOutTime(defaultStatus === 'work' ? '17:30' : '');
    }
  }, [currentDayLog, dateIso, isOpen]);

  if (!isOpen) return null;

  const handleStatusChange = (newStatus: DayStatusType) => {
    setStatus(newStatus);
    const cfg = DAY_STATUS_CONFIGS[newStatus];
    if (cfg) {
      setTargetHours(String(cfg.defaultHours));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDayLog({
      date: dateIso,
      status,
      note: note.trim() || undefined,
      targetHours: parseFloat(targetHours) || 0,
      checkInTime: checkInTime || undefined,
      checkOutTime: checkOutTime || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-neutral-800" />
            <div>
              <h3 className="text-base font-bold text-neutral-900">Thiết lập ngày công & nghỉ</h3>
              <p className="text-xs text-neutral-500 font-medium">{formatVietnameseDate(dateIso)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Status Selection list */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              Trạng thái ngày *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(DAY_STATUS_CONFIGS).map((cfg) => {
                const isSelected = status === cfg.id;
                return (
                  <button
                    key={cfg.id}
                    type="button"
                    onClick={() => handleStatusChange(cfg.id)}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <span className="text-xs font-bold leading-snug">{cfg.label}</span>
                    <span className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {cfg.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Hours */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Mục tiêu giờ ngày
              </label>
              <div className="flex items-center border border-neutral-300 rounded-lg px-3 py-2 bg-white">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  className="w-full text-sm font-semibold focus:outline-none tabular-nums"
                />
                <span className="text-xs text-neutral-500 font-medium">giờ</span>
              </div>
            </div>

            {/* Check-in / out (optional) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Giờ vào - Ra (Chấm công)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  placeholder="Vào"
                  className="w-full px-2 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none"
                />
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  placeholder="Ra"
                  className="w-full px-2 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Note / Leave Reason */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Ghi chú lý do nghỉ / Thông tin ngày
            </label>
            <input
              type="text"
              placeholder="VD: Nghỉ phép cá nhân, WFH do sửa đường, Tăng ca release..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
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
              Lưu trạng thái ngày
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
