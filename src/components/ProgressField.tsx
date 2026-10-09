import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, History, Lock } from 'lucide-react';
import { useI18n } from '../i18n';
import { formatShortDate, parseDateIso } from '../utils/dateUtils';
import type { ProgressBounds } from '../utils/taskHistory';

interface ProgressFieldProps {
  id: string;
  /** Completion already kept inside the bounds */
  value: number;
  bounds: ProgressBounds;
  onChange: (pct: number) => void;
  /** Gap reason / solution fields, shown below 100% */
  children?: React.ReactNode;
}

const QUICK_PCT = [25, 50, 75, 100];
const TICKS = [0, 25, 50, 75, 100];
const shortDate = (iso: string) => formatShortDate(parseDateIso(iso));

/**
 * Track drawn behind an invisible native range input (keyboard, screen readers and
 * pointer handling stay native). The inner track is inset by half the thumb width,
 * matching where the native thumb centre can go.
 */
const ProgressTrack: React.FC<{ id: string; value: number; bounds: ProgressBounds; onChange: (pct: number) => void; label: string }> = ({
  id,
  value,
  bounds,
  onChange,
  label,
}) => {
  const done = value >= 100;
  return (
    <div className="relative h-9 select-none">
      <div className="absolute inset-y-0 left-[10px] right-[10px]" aria-hidden="true">
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
          {/* Range a later entry already reached: out of bounds */}
          {bounds.max < 100 && <div className="absolute inset-y-0 right-0 hatched bg-slate-100" style={{ left: `${bounds.max}%` }} />}
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${done ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
            initial={false}
            animate={{ width: `${value}%` }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          />
          {/* Progress logged before: kept, cannot be undone */}
          {bounds.min > 0 && <div className="absolute inset-y-0 left-0 bg-slate-900/15 hatched" style={{ width: `${bounds.min}%` }} />}
        </div>
        {TICKS.map((tick) => (
          <span key={tick} className="absolute top-[calc(50%+10px)] w-px h-1.5 bg-slate-300" style={{ left: `${tick}%` }} />
        ))}
        {bounds.min > 0 && bounds.min < 100 && (
          <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-4 rounded bg-slate-500" style={{ left: `${bounds.min}%` }} />
        )}
        <motion.span
          className={`absolute top-1/2 w-5 h-5 -mt-2.5 -ml-2.5 rounded-full bg-white border-2 elevation-2 ${done ? 'border-emerald-500' : 'border-indigo-600'} ${
            bounds.locked ? 'opacity-60' : ''
          }`}
          initial={false}
          animate={{ left: `${value}%` }}
          transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        />
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={bounds.locked}
        aria-label={label}
        aria-valuetext={`${value}%`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input peer"
      />
      <span className="pointer-events-none absolute inset-0 rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/60" aria-hidden="true" />
    </div>
  );
};

/** Where the task stands: progress logged before, what this entry adds and what is left. */
const HistoryLine: React.FC<{ value: number; bounds: ProgressBounds }> = ({ value, bounds }) => {
  const { t } = useI18n();
  const p = t.progress;
  if (bounds.locked && bounds.previous) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <Lock className="w-3.5 h-3.5" />
        {p.locked(shortDate(bounds.previous.date))}
      </p>
    );
  }
  const gained = value - bounds.min;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
      {bounds.previous ? (
        <span className="inline-flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-slate-400" />
          {p.previous(bounds.previous.pct, shortDate(bounds.previous.date))}
        </span>
      ) : (
        <span className="text-slate-500">{p.firstLog}</span>
      )}
      {gained > 0 && bounds.previous && <span className="font-semibold text-indigo-700">{p.gained(gained)}</span>}
      <span className={`font-semibold ${value >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
        {value >= 100 ? p.complete : p.remaining(100 - value)}
      </span>
      {bounds.next && <span className="text-slate-500">{p.next(bounds.next.pct, shortDate(bounds.next.date))}</span>}
    </p>
  );
};

/** Completion slider bounded by the task's history, with the gap fields below 100%. */
export const ProgressField: React.FC<ProgressFieldProps> = ({ id, value, bounds, onChange, children }) => {
  const { t } = useI18n();
  const clamp = (pct: number) => Math.min(bounds.max, Math.max(bounds.min, pct));
  return (
    <div className="space-y-3">
      {/* Nothing in this row changes width with the value, so the track never moves under the pointer */}
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="field-label mb-0">
          {t.dayLog.completionLabel}
        </label>
        <span className={`w-20 text-right text-2xl font-black tabular-nums leading-none ${value >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
          {value}%
        </span>
      </div>

      <ProgressTrack id={id} value={value} bounds={bounds} onChange={(pct) => onChange(clamp(pct))} label={t.dayLog.completionLabel} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <HistoryLine value={value} bounds={bounds} />
        {!bounds.locked && (
          <div className="flex items-center gap-1 shrink-0">
            {QUICK_PCT.map((pct) => {
              const allowed = pct >= bounds.min && pct <= bounds.max;
              return (
                <button
                  key={pct}
                  type="button"
                  disabled={!allowed}
                  onClick={() => onChange(pct)}
                  aria-pressed={value === pct}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full tabular-nums transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                    value === pct ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pct === 100 ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      100%
                    </span>
                  ) : (
                    `${pct}%`
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {value < 100 && children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
