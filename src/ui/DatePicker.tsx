import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  addDays,
  formatDateIso,
  formatMonthYear,
  getMondayOfWeek,
  getMonthNames,
  getWeekdayNames,
  isSameDay,
} from '../utils/dateUtils';
import { useDismiss } from './useDismiss';

export type PickerMode = 'day' | 'week' | 'month';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: PickerMode;
  /** Content of the trigger button */
  label: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  ariaLabel?: string;
  /** 'field' renders the trigger like a form input */
  variant?: 'inline' | 'field';
}

const TRIGGER_CLASS = {
  inline: 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-900 hover:bg-indigo-50 rounded-lg transition-colors tabular-nums',
  field: 'input-field flex items-center gap-2 text-left tabular-nums',
};

const POPOVER_WIDTH = 296;

function monthGrid(viewMonth: Date): Date[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const start = getMondayOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * Material-style date picker popover: pick a day, a whole week or a month.
 * Arrow keys move the focused day, PageUp/PageDown change month, Enter selects.
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  mode = 'day',
  label,
  align = 'left',
  className = '',
  ariaLabel,
  variant = 'inline',
}) => {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'days' | 'months'>(mode === 'month' ? 'months' : 'days');
  const [cursor, setCursor] = useState(value);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [side, setSide] = useState(align);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, [triggerRef, popoverRef], close);

  useEffect(() => {
    if (open) {
      // Open towards the side that has room for the 296px popover
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const fitsRight = rect.left + POPOVER_WIDTH <= window.innerWidth - 8;
        const fitsLeft = rect.right - POPOVER_WIDTH >= 8;
        setSide(align === 'right' ? (fitsLeft || !fitsRight ? 'right' : 'left') : fitsRight || !fitsLeft ? 'left' : 'right');
      }
      setCursor(value);
      setView(mode === 'month' ? 'months' : 'days');
    }
  }, [open, value, mode, align]);

  useEffect(() => {
    if (open && view === 'days') {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${formatDateIso(cursor)}"]`)?.focus();
    }
  }, [open, view, cursor]);

  const weekdays = useMemo(() => getWeekdayNames(lang, true), [lang]);
  const monthNames = useMemo(() => getMonthNames(lang), [lang]);
  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const today = new Date();

  const select = (date: Date) => {
    onChange(date);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const shiftMonth = (delta: number) => {
    const target = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    const day = Math.min(cursor.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate());
    setCursor(new Date(target.getFullYear(), target.getMonth(), day));
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in moves) {
      e.preventDefault();
      setCursor((c) => addDays(c, moves[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      shiftMonth(e.key === 'PageUp' ? -1 : 1);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const monday = getMondayOfWeek(cursor);
      setCursor(e.key === 'Home' ? monday : addDays(monday, 6));
    }
  };

  const inSelectedWeek = (d: Date, ref: Date | null) =>
    mode === 'week' && ref !== null && isSameDay(getMondayOfWeek(d), getMondayOfWeek(ref));

  return (
    <div className={`relative ${variant === 'field' ? 'flex w-full' : 'inline-flex'} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={ariaLabel ?? t.datePicker.open}
        title={ariaLabel ?? t.datePicker.open}
        className={TRIGGER_CLASS[variant]}
      >
        <CalendarDays className="w-4 h-4 text-indigo-600" />
        <span className={variant === 'field' ? 'flex-1' : ''}>{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            id={dialogId}
            role="dialog"
            aria-label={ariaLabel ?? t.datePicker.open}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            style={{ transformOrigin: side === 'right' ? 'top right' : 'top left' }}
            className={`absolute top-full mt-2 z-40 w-[296px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl elevation-3 border border-neutral-200 p-3 ${
              side === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setView(view === 'days' ? 'months' : 'days')}
                className="px-2 py-1 text-sm font-bold text-neutral-900 rounded-lg hover:bg-neutral-100"
                aria-label={t.datePicker.chooseMonth}
              >
                {view === 'days' ? formatMonthYear(cursor, lang) : cursor.getFullYear()}
              </button>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => (view === 'days' ? shiftMonth(-1) : setCursor(new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)))}
                  aria-label={t.common.prevMonth}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => (view === 'days' ? shiftMonth(1) : setCursor(new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)))}
                  aria-label={t.common.nextMonth}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {view === 'months' ? (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {monthNames.map((name, m) => {
                  const selected = value.getFullYear() === cursor.getFullYear() && value.getMonth() === m;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        const target = new Date(cursor.getFullYear(), m, 1);
                        if (mode === 'month') select(target);
                        else {
                          setCursor(target);
                          setView('days');
                        }
                      }}
                      className={`py-2.5 text-xs font-semibold rounded-full capitalize transition-colors ${
                        selected ? 'bg-indigo-600 text-white' : 'text-neutral-700 hover:bg-indigo-50'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div ref={gridRef} onKeyDown={onGridKey} role="grid" onMouseLeave={() => setHovered(null)}>
                <div className="grid grid-cols-7 mb-1" role="row">
                  {weekdays.map((w, i) => (
                    <div key={w} role="columnheader" className={`text-center text-[10px] font-bold uppercase py-1 ${i >= 5 ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5">
                  {days.map((d) => {
                    const iso = formatDateIso(d);
                    const inMonth = d.getMonth() === cursor.getMonth();
                    const selected = mode === 'week' ? inSelectedWeek(d, value) : isSameDay(d, value);
                    const weekHover = inSelectedWeek(d, hovered);
                    const isToday = isSameDay(d, today);
                    const focused = isSameDay(d, cursor);
                    return (
                      <button
                        key={iso}
                        type="button"
                        data-iso={iso}
                        tabIndex={focused ? 0 : -1}
                        aria-selected={selected}
                        onMouseEnter={() => setHovered(d)}
                        onClick={() => select(d)}
                        className={`h-9 text-xs tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                          mode === 'week' ? 'rounded-none first:rounded-l-full' : 'rounded-full'
                        } ${
                          selected
                            ? 'bg-indigo-600 text-white font-bold'
                            : weekHover
                              ? 'bg-indigo-50 text-indigo-900'
                              : inMonth
                                ? 'text-neutral-800 hover:bg-indigo-50'
                                : 'text-neutral-300 hover:bg-neutral-50'
                        } ${isToday && !selected ? 'ring-1 ring-inset ring-indigo-500 font-bold' : ''}`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 mt-2 border-t border-neutral-100">
              <button type="button" onClick={() => select(new Date())} className="btn-text text-xs">
                {t.datePicker.goToday}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
