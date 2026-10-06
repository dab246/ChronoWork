import React from 'react';
import { motion } from 'motion/react';
import { Target, CheckCircle2, Award, Flame, Lightbulb } from 'lucide-react';
import type { TimeEntry, DayLog, UserSettings } from '../types';
import { formatDateIso, formatHours, formatShortDate, getDayName, getWeekDays } from '../utils/dateUtils';
import { entryHours, filterEntriesForDays, getDayTargetHours, getWeeklyTargetHours, sumHours } from '../utils/workdays';
import { useI18n } from '../i18n';
import { WeekNavigator } from './WeekNavigator';

interface PerformanceViewProps {
  currentDate: Date;
  onChangeDate: (d: Date) => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
}

type Insight = { type: 'success' | 'info' | 'warning'; text: string };

const DEEP = new Set(['development', 'security', 'bugfix']);
const NORMAL = new Set(['pr_review', 'release']);

const Bar: React.FC<{ value: number; className: string }> = ({ value, className }) => (
  <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
    <motion.div className={`h-full rounded-full ${className}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }} />
  </div>
);

export const PerformanceView: React.FC<PerformanceViewProps> = ({ currentDate, onChangeDate, entries, dayLogs, settings }) => {
  const { t, lang } = useI18n();
  const p = t.performance;
  const weekDays = getWeekDays(currentDate);
  const weekEntries = filterEntriesForDays(entries, weekDays);

  const totalHours = sumHours(weekEntries);
  const targetHours = getWeeklyTargetHours(weekDays, dayLogs, settings);
  const targetPct = targetHours > 0 ? Math.round((totalHours / targetHours) * 100) : 100;

  let deep = 0;
  let normal = 0;
  let meeting = 0;
  for (const e of weekEntries) {
    const h = entryHours(e);
    if (e.focusLevel === 'deep' || (!e.focusLevel && DEEP.has(e.category ?? 'development'))) deep += h;
    else if (e.focusLevel === 'normal' || (!e.focusLevel && NORMAL.has(e.category ?? ''))) normal += h;
    if (e.category === 'meeting') meeting += h;
  }
  const pct = (h: number) => (totalHours > 0 ? Math.round((h / totalHours) * 100) : 0);
  const deepPct = pct(deep);
  const normalPct = pct(normal);
  const shallowPct = totalHours > 0 ? Math.max(0, 100 - deepPct - normalPct) : 0;
  const meetingPct = pct(meeting);

  const totalTasks = weekEntries.length;
  const completedTasks = weekEntries.filter((e) => e.completionPct === 100).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const daily = weekDays.map((d) => sumHours(weekEntries.filter((e) => e.date === formatDateIso(d))));
  const targets = weekDays.map((d) => getDayTargetHours(d, dayLogs, settings));
  const maxValue = Math.max(...daily, ...targets, 1) * 1.15;

  const insights: Insight[] = [];
  if (targetPct >= 100) insights.push({ type: 'success', text: p.insights.excellent(targetPct, formatHours(totalHours), formatHours(targetHours)) });
  else if (targetPct >= 80) insights.push({ type: 'info', text: p.insights.good(targetPct, formatHours(targetHours - totalHours)) });
  else insights.push({ type: 'warning', text: p.insights.low(targetPct) });
  if (deepPct >= 50) insights.push({ type: 'success', text: p.insights.deepHigh(deepPct) });
  else if (deepPct < 30 && totalHours > 0) insights.push({ type: 'warning', text: p.insights.deepLow(deepPct) });
  insights.push(
    meetingPct > 35
      ? { type: 'warning', text: p.insights.meetingHigh(meetingPct, formatHours(meeting)) }
      : { type: 'info', text: p.insights.meetingOk(meetingPct) }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">{p.title}</h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">{p.subtitle}</p>
        </div>
        <WeekNavigator currentDate={currentDate} onChange={onChangeDate} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-hover p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              <span>{p.goal}</span>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-950 tabular-nums">{targetPct}%</span>
              <span className="text-xs text-neutral-500">({formatHours(totalHours)}h / {formatHours(targetHours)}h)</span>
            </div>
          </div>
          <div>
            <Bar value={targetPct} className={targetPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'} />
            <div className="flex justify-between text-[11px] text-neutral-500 mt-1.5">
              <span>0h</span>
              <span>{p.standard(formatHours(targetHours))}</span>
            </div>
          </div>
        </div>

        <div className="card card-hover p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              <span>{p.deepWork}</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-950 tabular-nums">{deepPct}%</span>
              <span className="text-xs text-neutral-500">{p.deepHours(formatHours(deep))}</span>
            </div>
          </div>
          <div>
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden flex">
              <div className="bg-indigo-600 h-full" style={{ width: `${deepPct}%` }} />
              <div className="bg-indigo-300 h-full" style={{ width: `${normalPct}%` }} />
              <div className="bg-neutral-300 h-full" style={{ width: `${shallowPct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 mt-1.5 gap-2">
              <span className="text-indigo-700 font-medium">{p.deep}: {deepPct}%</span>
              <span>{p.normal}: {normalPct}%</span>
              <span>{p.light}: {shallowPct}%</span>
            </div>
          </div>
        </div>

        <div className="card card-hover p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              <span>{p.completion}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-950 tabular-nums">{completionRate}%</span>
              <span className="text-xs text-neutral-500">({completedTasks} / {totalTasks})</span>
            </div>
          </div>
          <div>
            <Bar value={completionRate} className="bg-emerald-500" />
            <div className="flex justify-between text-[11px] text-neutral-500 mt-1.5">
              <span>{p.inProgress(totalTasks - completedTasks)}</span>
              <span className="text-emerald-700 font-medium">{p.done(completedTasks)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">{p.chartTitle}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{p.chartSubtitle(formatHours(settings.dailyStandardHours))}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600" />
              {p.actual}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-neutral-500" />
              {p.standardLine(formatHours(settings.dailyStandardHours))}
            </span>
          </div>
        </div>

        <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-neutral-200">
          {weekDays.map((day, idx) => {
            const hours = daily[idx];
            const target = targets[idx];
            return (
              <div key={formatDateIso(day)} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="text-[11px] font-bold text-neutral-900 mb-1 tabular-nums">{hours > 0 ? `${formatHours(hours)}h` : '–'}</div>
                <div className="relative w-full max-w-[48px] h-full flex items-end justify-center">
                  {target > 0 && (
                    <div className="absolute w-full border-t-2 border-dashed border-neutral-400 z-10 pointer-events-none" style={{ bottom: `${(target / maxValue) * 100}%` }} />
                  )}
                  <motion.div
                    className={`w-full rounded-t-lg ${hours >= target && hours > 0 ? 'bg-emerald-500' : hours > 0 ? 'bg-indigo-600' : 'bg-neutral-200/60'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(3, (hours / maxValue) * 100)}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.04, ease: [0.2, 0, 0, 1] }}
                  />
                </div>
                <div className="text-center mt-2">
                  <div className="text-xs font-semibold text-neutral-800 capitalize">{getDayName(day, lang, true)}</div>
                  <div className="text-[10px] text-neutral-400 tabular-nums">{formatShortDate(day)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          {p.insightsTitle}
        </h3>
        <div className="space-y-3">
          {insights.map((item, idx) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                item.type === 'success'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : item.type === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-800'
              }`}
            >
              <Award className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
              <p className="leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
