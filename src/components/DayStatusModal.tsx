import React, { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DAY_STATUSES, DAY_STATUS_CONFIGS, type DayLog, type DayStatusType, type UserSettings } from '../types';
import { formatLongDate, parseDateIso } from '../utils/dateUtils';
import { getDayTargetHours, getEffectiveStatus } from '../utils/workdays';
import { clampNumber } from '../utils/security';
import { useI18n } from '../i18n';
import { Modal } from '../ui/Modal';

interface DayStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateIso: string;
  currentDayLog?: DayLog;
  settings: UserSettings;
  onSaveDayLog: (log: DayLog) => void;
}

function defaultHoursFor(status: DayStatusType, settings: UserSettings): number {
  return status === 'work' || status === 'wfh' ? settings.dailyStandardHours : DAY_STATUS_CONFIGS[status].defaultHours;
}

export const DayStatusModal: React.FC<DayStatusModalProps> = ({ isOpen, onClose, dateIso, currentDayLog, settings, onSaveDayLog }) => {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<DayStatusType>('work');
  const [note, setNote] = useState('');
  const [targetHours, setTargetHours] = useState('8');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    // parseDateIso avoids the UTC shift of new Date('YYYY-MM-DD')
    const date = parseDateIso(dateIso);
    const logs = currentDayLog ? { [dateIso]: currentDayLog } : {};
    setStatus(getEffectiveStatus(date, logs, settings));
    setNote(currentDayLog?.note ?? '');
    setTargetHours(String(getDayTargetHours(date, logs, settings)));
    setCheckInTime(currentDayLog?.checkInTime ?? '');
    setCheckOutTime(currentDayLog?.checkOutTime ?? '');
  }, [isOpen, dateIso, currentDayLog, settings]);

  const handleStatusChange = (next: DayStatusType) => {
    setStatus(next);
    setTargetHours(String(defaultHoursFor(next, settings)));
  };

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSaveDayLog({
      date: dateIso,
      status,
      note: note.trim() || undefined,
      targetHours: clampNumber(targetHours, 0, 24, 0),
      checkInTime: checkInTime || undefined,
      checkOutTime: checkOutTime || undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      icon={<CalendarDays className="w-5 h-5" />}
      title={t.dayStatusModal.title}
      subtitle={formatLongDate(dateIso, lang)}
    >
      <form onSubmit={handleSave} className="space-y-4">
        <fieldset>
          <legend className="field-label">{t.dayStatusModal.statusLabel}</legend>
          <div className="grid grid-cols-2 gap-2">
            {DAY_STATUSES.map((id) => {
              const selected = status === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleStatusChange(id)}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                    selected ? 'border-indigo-600 bg-indigo-600 text-white elevation-2' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold leading-snug">{t.status[id].label}</span>
                  <span className={`text-[10px] mt-0.5 line-clamp-1 ${selected ? 'text-indigo-100' : 'text-slate-500'}`}>{t.status[id].description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="day-target">
              {t.dayStatusModal.targetHours}
            </label>
            <input id="day-target" type="number" step="0.5" min="0" max="24" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} className="input-field tabular-nums" />
          </div>
          <div>
            <span className="field-label">{t.dayStatusModal.checkInOut}</span>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="time" aria-label={t.dayStatusModal.checkIn} value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="input-field text-xs px-2" />
              <input type="time" aria-label={t.dayStatusModal.checkOut} value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="input-field text-xs px-2" />
            </div>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="day-note">
            {t.dayStatusModal.noteLabel}
          </label>
          <input id="day-note" type="text" maxLength={500} placeholder={t.dayStatusModal.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} className="input-field" />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-text">
            {t.common.cancel}
          </button>
          <button type="submit" className="btn-filled">
            {t.dayStatusModal.save}
          </button>
        </div>
      </form>
    </Modal>
  );
};
