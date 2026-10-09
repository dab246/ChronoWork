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
  inline: 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-indigo-50 rounded-lg transition-colors tabular-nums',
  field: 'input-field flex items-center gap-2 text-left tabular-nums',
};

const POPOVER_WIDTH = 296;

/** Popover anchoring per side; class names stay literal so Tailwind picks them up. */
const SIDE = {
  left: { className: 'left-0', origin: 'top left' },
  right: { className: 'right-0', origin: 'top right' },
};

const OTHER_VIEW = { days: 'months', months: 'days' } as const;

function monthGrid(viewMonth: Date): Date[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const start = getMondayOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Opens towards the side that has room for the popover, preferring `align`. */
function popoverSide(align: 'left' | 'right', rect: DOMRect): 'left' | 'right' {
  const fitsRight = rect.left + POPOVER_WIDTH <= window.innerWidth - 8;
  const fitsLeft = rect.right - POPOVER_WIDTH >= 8;
  if (align === 'right') return fitsLeft || !fitsRight ? 'right' : 'left';
  return fitsRight || !fitsLeft ? 'left' : 'right';
}

/** Same day of month in the month `delta` months away, clamped to that month's length. */
function shiftMonth(date: Date, delta: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const day = Math.min(date.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate());
  return new Date(target.getFullYear(), target.getMonth(), day);
}

const DAY_MOVES: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const GRID_KEYS: Record<string, (cursor: Date) => Date> = {
  ...Object.fromEntries(Object.entries(DAY_MOVES).map(([key, days]) => [key, (c: Date) => addDays(c, days)])),
  PageUp: (c) => shiftMonth(c, -1),
  PageDown: (c) => shiftMonth(c, 1),
  Home: (c) => getMondayOfWeek(c),
  End: (c) => addDays(getMondayOfWeek(c), 6),
};

const sameWeek = (a: Date, b: Date | null) => b !== null && isSameDay(getMondayOfWeek(a), getMondayOfWeek(b));

interface DayState {
  selected: boolean;
  weekHover: boolean;
  inMonth: boolean;
  isToday: boolean;
}

function dayColorClass({ selected, weekHover, inMonth }: DayState): string {
  if (selected) return 'bg-indigo-600 text-white font-bold';
  if (weekHover) return 'bg-indigo-50 text-indigo-900';
  return inMonth ? 'text-slate-800 hover:bg-indigo-50' : 'text-slate-300 hover:bg-slate-50';
}

function dayClass(state: DayState, weekMode: boolean): string {
  const shape = weekMode ? 'rounded-none first:rounded-l-full' : 'rounded-full';
  const today = state.isToday && !state.selected ? 'ring-1 ring-inset ring-indigo-500 font-bold' : '';
  return `h-9 text-xs tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${shape} ${dayColorClass(state)} ${today}`;
}

interface PickerHeaderProps {
  view: 'days' | 'months';
  cursor: Date;
  onToggleView: () => void;
  onStep: (delta: number) => void;
}

const PickerHeader: React.FC<PickerHeaderProps> = ({ view, cursor, onToggleView, onStep }) => {
  const { t, lang } = useI18n();
  return (
    <div className="flex items-center justify-between mb-2">
      <button
        type="button"
        onClick={onToggleView}
        className="px-2 py-1 text-sm font-bold text-slate-900 rounded-lg hover:bg-slate-100"
        aria-label={t.datePicker.chooseMonth}
      >
        {view === 'days' ? formatMonthYear(cursor, lang) : cursor.getFullYear()}
      </button>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onStep(-1)}
          aria-label={t.common.prevMonth}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onStep(1)}
          aria-label={t.common.nextMonth}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface MonthListProps {
  value: Date;
  cursor: Date;
  onPick: (month: Date) => void;
}

const MonthList: React.FC<MonthListProps> = ({ value, cursor, onPick }) => {
  const { lang } = useI18n();
  const monthNames = useMemo(() => getMonthNames(lang), [lang]);
  return (
    <div className="grid grid-cols-3 gap-1.5 py-1">
      {monthNames.map((name, m) => {
        const selected = value.getFullYear() === cursor.getFullYear() && value.getMonth() === m;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onPick(new Date(cursor.getFullYear(), m, 1))}
            className={`py-2.5 text-xs font-semibold rounded-full capitalize transition-colors ${
              selected ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
};

interface DayGridProps {
  ref: React.Ref<HTMLDivElement>;
  value: Date;
  cursor: Date;
  weekMode: boolean;
  onCursor: (update: (cursor: Date) => Date) => void;
  onSelect: (date: Date) => void;
}

const DayGrid: React.FC<DayGridProps> = ({ ref, value, cursor, weekMode, onCursor, onSelect }) => {
  const { lang } = useI18n();
  const [hovered, setHovered] = useState<Date | null>(null);
  const weekdays = useMemo(() => getWeekdayNames(lang, true), [lang]);
  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const today = new Date();

  const onKeyDown = (e: React.KeyboardEvent) => {
    const move = GRID_KEYS[e.key];
    if (!move) return;
    e.preventDefault();
    onCursor(move);
  };

  const stateOf = (d: Date): DayState => ({
    selected: weekMode ? sameWeek(d, value) : isSameDay(d, value),
    weekHover: weekMode && sameWeek(d, hovered),
    inMonth: d.getMonth() === cursor.getMonth(),
    isToday: isSameDay(d, today),
  });

  return (
    <div ref={ref} onKeyDown={onKeyDown} role="grid" onMouseLeave={() => setHovered(null)}>
      <div className="grid grid-cols-7 mb-1" role="row">
        {weekdays.map((w, i) => (
          <div key={w} role="columnheader" className={`text-center text-[10px] font-bold uppercase py-1 ${i >= 5 ? 'text-slate-400' : 'text-slate-500'}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const iso = formatDateIso(d);
          const state = stateOf(d);
          return (
            <button
              key={iso}
              type="button"
              data-iso={iso}
              tabIndex={isSameDay(d, cursor) ? 0 : -1}
              aria-selected={state.selected}
              onMouseEnter={() => setHovered(d)}
              onClick={() => onSelect(d)}
              className={dayClass(state, weekMode)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface PopoverProps {
  ref: React.Ref<HTMLDivElement>;
  id: string;
  label: string;
  side: 'left' | 'right';
  value: Date;
  mode: PickerMode;
  onSelect: (date: Date) => void;
}

const PickerPopover: React.FC<PopoverProps> = ({ ref, id, label, side, value, mode, onSelect }) => {
  const { t } = useI18n();
  const initialView = mode === 'month' ? 'months' : 'days';
  const [view, setView] = useState<'days' | 'months'>(initialView);
  const [cursor, setCursor] = useState(value);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCursor(value);
    setView(initialView);
  }, [value, initialView]);

  useEffect(() => {
    if (view === 'days') {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${formatDateIso(cursor)}"]`)?.focus();
    }
  }, [view, cursor]);

  // Header arrows step by month in the day view, by year in the month view
  const step = (delta: number) =>
    setCursor((c) => (view === 'days' ? shiftMonth(c, delta) : new Date(c.getFullYear() + delta, c.getMonth(), 1)));

  const pickMonth = (month: Date) => {
    if (mode === 'month') return onSelect(month);
    setCursor(month);
    setView('days');
  };

  return (
    <motion.div
      ref={ref}
      id={id}
      role="dialog"
      aria-label={label}
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
      style={{ transformOrigin: SIDE[side].origin }}
      className={`absolute top-full mt-2 z-40 w-[296px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl elevation-3 border border-slate-200 p-3 ${SIDE[side].className}`}
    >
      <PickerHeader view={view} cursor={cursor} onToggleView={() => setView(OTHER_VIEW[view])} onStep={step} />
      {view === 'months' ? (
        <MonthList value={value} cursor={cursor} onPick={pickMonth} />
      ) : (
        <DayGrid ref={gridRef} value={value} cursor={cursor} weekMode={mode === 'week'} onCursor={setCursor} onSelect={onSelect} />
      )}
      <div className="flex justify-end pt-2 mt-2 border-t border-slate-100">
        <button type="button" onClick={() => onSelect(new Date())} className="btn-text text-xs">
          {t.datePicker.goToday}
        </button>
      </div>
    </motion.div>
  );
};

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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState(align);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const dialogLabel = ariaLabel ?? t.datePicker.open;

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, [triggerRef, popoverRef], close);

  useEffect(() => {
    const rect = open ? triggerRef.current?.getBoundingClientRect() : undefined;
    if (rect) setSide(popoverSide(align, rect));
  }, [open, align]);

  const select = (date: Date) => {
    onChange(date);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`relative ${variant === 'field' ? 'flex w-full' : 'inline-flex'} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={dialogLabel}
        title={dialogLabel}
        className={TRIGGER_CLASS[variant]}
      >
        <CalendarDays className="w-4 h-4 shrink-0 text-indigo-600" />
        <span className={variant === 'field' ? 'flex-1 min-w-0 truncate' : 'whitespace-nowrap'}>{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <PickerPopover ref={popoverRef} id={dialogId} label={dialogLabel} side={side} value={value} mode={mode} onSelect={select} />
        )}
      </AnimatePresence>
    </div>
  );
};
