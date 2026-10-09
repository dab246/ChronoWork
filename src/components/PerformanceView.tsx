import React from 'react';
import { motion } from 'motion/react';
import { Target, CheckCircle2, Award, Flame, Lightbulb, TrendingUp, BarChart3 } from 'lucide-react';
import type { TimeEntry, DayLog, UserSettings } from '../types';
import { formatDateIso, formatHours, formatShortDate, getDayName, getWeekDays } from '../utils/dateUtils';
import { entryHours, filterEntriesForDays, getDayTargetHours, getWeeklyTargetHours, sumHours } from '../utils/workdays';
import { useI18n, type Translations } from '../i18n';
import { WeekNavigator } from './WeekNavigator';
import { PageHeader, PageStack, Reveal, SectionCard } from '../ui/layout';

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
  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
    <motion.div className={`h-full rounded-full ${className}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }} />
  </div>
);

/** Focus level of an entry; entries without one are classified by category. */
function focusOf(e: TimeEntry): 'deep' | 'normal' | 'other' {
  if (e.focusLevel) return e.focusLevel === 'deep' || e.focusLevel === 'normal' ? e.focusLevel : 'other';
  if (DEEP.has(e.category ?? 'development')) return 'deep';
  return NORMAL.has(e.category ?? '') ? 'normal' : 'other';
}

/** Hours per focus level, plus meeting hours. */
function focusHours(entries: TimeEntry[]) {
  const hours = { deep: 0, normal: 0, other: 0, meeting: 0 };
  for (const e of entries) {
    const h = entryHours(e);
    hours[focusOf(e)] += h;
    if (e.category === 'meeting') hours.meeting += h;
  }
  return hours;
}

const percentOf = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

interface InsightInput {
  targetPct: number;
  totalHours: number;
  targetHours: number;
  deepPct: number;
  meetingPct: number;
  meetingHours: number;
}

function targetInsight(p: Translations['performance'], { targetPct, totalHours, targetHours }: InsightInput): Insight {
  if (targetPct >= 100) return { type: 'success', text: p.insights.excellent(targetPct, formatHours(totalHours), formatHours(targetHours)) };
  if (targetPct >= 80) return { type: 'info', text: p.insights.good(targetPct, formatHours(targetHours - totalHours)) };
  return { type: 'warning', text: p.insights.low(targetPct) };
}

function deepWorkInsight(p: Translations['performance'], { deepPct, totalHours }: InsightInput): Insight | null {
  if (deepPct >= 50) return { type: 'success', text: p.insights.deepHigh(deepPct) };
  if (deepPct < 30 && totalHours > 0) return { type: 'warning', text: p.insights.deepLow(deepPct) };
  return null;
}

function meetingInsight(p: Translations['performance'], { meetingPct, meetingHours }: InsightInput): Insight {
  return meetingPct > 35
    ? { type: 'warning', text: p.insights.meetingHigh(meetingPct, formatHours(meetingHours)) }
    : { type: 'info', text: p.insights.meetingOk(meetingPct) };
}

function buildInsights(p: Translations['performance'], input: InsightInput): Insight[] {
  return [targetInsight(p, input), deepWorkInsight(p, input), meetingInsight(p, input)].filter((i): i is Insight => i !== null);
}

const INSIGHT_CLASS: Record<Insight['type'], string> = {
  success: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50/70 border-amber-200 text-amber-900',
  info: 'bg-slate-50 border-slate-200 text-slate-800',
};

interface StatCardProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  detail: React.ReactNode;
  children: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, icon, value, detail, children }) => (
  <Reveal className="card card-hover p-5 flex flex-col justify-between gap-4">
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-950 tabular-nums">{value}%</span>
        <span className="text-xs text-slate-500">{detail}</span>
      </div>
    </div>
    <div>{children}</div>
  </Reveal>
);

function barColor(hours: number, target: number): string {
  if (hours <= 0) return 'bg-slate-200/60';
  return hours >= target ? 'bg-emerald-500' : 'bg-gradient-to-t from-indigo-600 to-violet-500';
}

interface DayColumnProps {
  day: Date;
  index: number;
  hours: number;
  target: number;
  maxValue: number;
}

const DayColumn: React.FC<DayColumnProps> = ({ day, index, hours, target, maxValue }) => {
  const { lang } = useI18n();
  return (
    <div className="flex-1 flex flex-col items-center h-full justify-end group">
      <div className="text-[11px] font-bold text-slate-900 mb-1 tabular-nums">{hours > 0 ? `${formatHours(hours)}h` : '–'}</div>
      <div className="relative w-full max-w-[48px] h-full flex items-end justify-center">
        {target > 0 && (
          <div className="absolute w-full border-t-2 border-dashed border-slate-400 z-10 pointer-events-none" style={{ bottom: `${(target / maxValue) * 100}%` }} />
        )}
        <motion.div
          className={`w-full rounded-t-lg ${barColor(hours, target)}`}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(3, (hours / maxValue) * 100)}%` }}
          transition={{ duration: 0.5, delay: index * 0.04, ease: [0.2, 0, 0, 1] }}
        />
      </div>
      <div className="text-center mt-2">
        <div className="text-xs font-semibold text-slate-800 capitalize">{getDayName(day, lang, true)}</div>
        <div className="text-[10px] text-slate-400 tabular-nums">{formatShortDate(day)}</div>
      </div>
    </div>
  );
};

export const PerformanceView: React.FC<PerformanceViewProps> = ({ currentDate, onChangeDate, entries, dayLogs, settings }) => {
  const { t } = useI18n();
  const p = t.performance;
  const weekDays = getWeekDays(currentDate);
  const weekEntries = filterEntriesForDays(entries, weekDays);

  const totalHours = sumHours(weekEntries);
  const targetHours = getWeeklyTargetHours(weekDays, dayLogs, settings);
  const targetPct = targetHours > 0 ? Math.round((totalHours / targetHours) * 100) : 100;

  const hours = focusHours(weekEntries);
  const deepPct = percentOf(hours.deep, totalHours);
  const normalPct = percentOf(hours.normal, totalHours);
  const shallowPct = totalHours > 0 ? Math.max(0, 100 - deepPct - normalPct) : 0;
  const meetingPct = percentOf(hours.meeting, totalHours);

  const totalTasks = weekEntries.length;
  const completedTasks = weekEntries.filter((e) => e.completionPct === 100).length;
  const completionRate = percentOf(completedTasks, totalTasks);

  const daily = weekDays.map((d) => sumHours(weekEntries.filter((e) => e.date === formatDateIso(d))));
  const targets = weekDays.map((d) => getDayTargetHours(d, dayLogs, settings));
  const maxValue = Math.max(...daily, ...targets, 1) * 1.15;

  const insights = buildInsights(p, { targetPct, totalHours, targetHours, deepPct, meetingPct, meetingHours: hours.meeting });

  return (
    <PageStack>
      <PageHeader icon={TrendingUp} title={p.title} subtitle={p.subtitle} actions={<WeekNavigator currentDate={currentDate} onChange={onChangeDate} />} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label={p.goal}
          icon={<Target className="w-4 h-4 text-indigo-400" />}
          value={targetPct}
          detail={`(${formatHours(totalHours)}h / ${formatHours(targetHours)}h)`}
        >
          <Bar value={targetPct} className={targetPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'} />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
            <span>0h</span>
            <span>{p.standard(formatHours(targetHours))}</span>
          </div>
        </StatCard>

        <StatCard label={p.deepWork} icon={<Flame className="w-4 h-4 text-amber-500" />} value={deepPct} detail={p.deepHours(formatHours(hours.deep))}>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
            <div className="bg-indigo-600 h-full" style={{ width: `${deepPct}%` }} />
            <div className="bg-indigo-300 h-full" style={{ width: `${normalPct}%` }} />
            <div className="bg-slate-300 h-full" style={{ width: `${shallowPct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 gap-2">
            <span className="text-indigo-700 font-medium">{p.deep}: {deepPct}%</span>
            <span>{p.normal}: {normalPct}%</span>
            <span>{p.light}: {shallowPct}%</span>
          </div>
        </StatCard>

        <StatCard
          label={p.completion}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          value={completionRate}
          detail={`(${completedTasks} / ${totalTasks})`}
        >
          <Bar value={completionRate} className="bg-emerald-500" />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
            <span>{p.inProgress(totalTasks - completedTasks)}</span>
            <span className="text-emerald-700 font-medium">{p.done(completedTasks)}</span>
          </div>
        </StatCard>
      </div>

      <SectionCard
        icon={BarChart3}
        title={p.chartTitle}
        description={p.chartSubtitle(formatHours(settings.dailyStandardHours))}
        bodyClassName="p-6"
        actions={
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600" />
              {p.actual}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-slate-500" />
              {p.standardLine(formatHours(settings.dailyStandardHours))}
            </span>
          </div>
        }
      >

        <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-200">
          {weekDays.map((day, idx) => (
            <DayColumn key={formatDateIso(day)} day={day} index={idx} hours={daily[idx]} target={targets[idx]} maxValue={maxValue} />
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Lightbulb} tone="amber" title={p.insightsTitle} bodyClassName="p-5">
        <div className="space-y-3">
          {insights.map((item, idx) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${INSIGHT_CLASS[item.type]}`}
            >
              <Award className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
              <p className="leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </SectionCard>
    </PageStack>
  );
};
