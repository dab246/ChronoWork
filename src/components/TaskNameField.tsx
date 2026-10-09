import React, { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, History } from 'lucide-react';
import { useI18n } from '../i18n';
import { CATEGORY_COLORS } from '../types';
import { formatHours, formatShortDate, parseDateIso } from '../utils/dateUtils';
import { filterTaskSuggestions, taskKey, type TaskSuggestion } from '../utils/taskHistory';
import { useDismiss } from '../ui/useDismiss';

interface TaskNameFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  suggestions: TaskSuggestion[];
  onChange: (value: string) => void;
  onPick: (suggestion: TaskSuggestion) => void;
}

const SuggestionRow: React.FC<{ item: TaskSuggestion; id: string; active: boolean; current: boolean; onPick: () => void; onHover: () => void }> = ({
  item,
  id,
  active,
  current,
  onPick,
  onHover,
}) => {
  const { t } = useI18n();
  const done = item.completionPct >= 100;
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      // Keep the focus in the input
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      onMouseEnter={onHover}
      className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${active ? 'bg-indigo-50' : ''}`}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[item.category ?? 'other'] }} />
      <span className="flex-1 min-w-0">
        <span className={`block text-sm truncate ${current ? 'font-bold text-indigo-900' : 'font-semibold text-slate-900'}`}>{item.taskName}</span>
        <span className="block text-[11px] text-slate-500 truncate">
          {[item.project, t.taskSuggest.lastLogged(formatShortDate(parseDateIso(item.lastDate))), t.taskSuggest.logged(item.logCount, formatHours(item.totalHours))]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      {done ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">
          <CheckCircle2 className="w-3 h-3" />
          100%
        </span>
      ) : (
        <span className="flex items-center gap-1.5 shrink-0" title={t.progress.remaining(100 - item.completionPct)}>
          <span className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <span className="block h-full bg-indigo-500 rounded-full" style={{ width: `${item.completionPct}%` }} />
          </span>
          <span className="text-[11px] font-bold text-slate-700 tabular-nums w-8 text-right">{item.completionPct}%</span>
        </span>
      )}
    </li>
  );
};

interface KeyAction {
  enabled: boolean;
  run: () => void;
  /** Keep the key from reaching outer handlers (Escape must not close the dialog around the form) */
  stopPropagation?: boolean;
}

/** Open state, active option and keyboard handling of a combobox over `options`. */
function useCombobox<T>(options: T[], onPick: (option: T) => void) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const visible = open && options.length > 0;
  const hasActive = visible && active >= 0;

  const pick = (option: T) => {
    onPick(option);
    setOpen(false);
    setActive(-1);
  };
  const move = (delta: number) => () => (visible ? setActive((i) => (i + delta + options.length) % options.length) : setOpen(true));

  const keyActions: Record<string, KeyAction> = {
    ArrowDown: { enabled: true, run: move(1) },
    ArrowUp: { enabled: true, run: move(-1) },
    Enter: { enabled: hasActive, run: () => pick(options[active]) },
    Escape: { enabled: visible, run: () => setOpen(false), stopPropagation: true },
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const action = keyActions[e.key];
    if (!action?.enabled) return;
    if (action.stopPropagation) e.stopPropagation();
    else e.preventDefault();
    action.run();
  };

  const reopen = () => {
    setOpen(true);
    setActive(-1);
  };

  return { visible, active, hasActive, setActive, pick, onKeyDown, reopen, open: () => setOpen(true), close: () => setOpen(false) };
}

interface SuggestionListProps {
  listId: string;
  items: TaskSuggestion[];
  active: number;
  currentKey: string;
  onPick: (item: TaskSuggestion) => void;
  onHover: (index: number) => void;
}

const SuggestionList: React.FC<SuggestionListProps> = ({ listId, items, active, currentKey, onPick, onHover }) => {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.14 }}
      className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl elevation-3 z-30 overflow-hidden origin-top"
    >
      <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5 eyebrow">
        <History className="w-3.5 h-3.5" />
        {t.taskSuggest.title}
      </div>
      <ul id={listId} role="listbox" aria-label={t.taskSuggest.title} className="max-h-72 overflow-y-auto pb-1">
        {items.map((item, index) => (
          <SuggestionRow
            key={item.key}
            id={`${listId}-${index}`}
            item={item}
            active={index === active}
            current={item.key === currentKey}
            onPick={() => onPick(item)}
            onHover={() => onHover(index)}
          />
        ))}
      </ul>
    </motion.div>
  );
};

/**
 * Task name input suggesting tasks logged before (case-insensitive), so a task
 * worked on over several days or weeks keeps one name and its progress.
 * Combobox pattern: arrows move, Enter picks, Escape closes.
 */
export const TaskNameField: React.FC<TaskNameFieldProps> = ({ id, label, placeholder, value, suggestions, onChange, onPick }) => {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => filterTaskSuggestions(suggestions, value), [suggestions, value]);
  const combo = useCombobox(matches, onPick);

  useDismiss(combo.visible, [wrapperRef], combo.close);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={combo.visible}
        aria-controls={listId}
        aria-activedescendant={combo.hasActive ? `${listId}-${combo.active}` : undefined}
        maxLength={500}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          combo.reopen();
        }}
        onFocus={combo.open}
        onKeyDown={combo.onKeyDown}
        className="input-field font-semibold"
      />
      <AnimatePresence>
        {combo.visible && (
          <SuggestionList
            listId={listId}
            items={matches}
            active={combo.active}
            currentKey={value.trim() ? taskKey(value) : ''}
            onPick={combo.pick}
            onHover={combo.setActive}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
