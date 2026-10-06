import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Folder, Tag, GitPullRequest, Link2 } from 'lucide-react';
import { ActiveTimerState, TaskCategory, TimeEntry, CATEGORY_LABELS } from '../types';
import { formatSecondsToTime, formatDateIso } from '../utils/dateUtils';
import { parseGitHubUrl } from '../services/githubService';

interface LiveTimerProps {
  timerState: ActiveTimerState;
  setTimerState: React.Dispatch<React.SetStateAction<ActiveTimerState>>;
  projects: string[];
  onSaveTimeEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => void;
  soundEnabled: boolean;
}

export const LiveTimer: React.FC<LiveTimerProps> = ({
  timerState,
  setTimerState,
  projects,
  onSaveTimeEntry,
  soundEnabled,
}) => {
  const [seconds, setSeconds] = useState<number>(timerState.accumulatedSeconds || 0);
  const intervalRef = useRef<number | null>(null);

  const playTone = (freq = 440, type: OscillatorType = 'sine', duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  };

  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      const updateElapsed = () => {
        const now = Date.now();
        const diff = Math.floor((now - timerState.startTime!) / 1000);
        setSeconds(timerState.accumulatedSeconds + diff);
      };
      updateElapsed();
      intervalRef.current = window.setInterval(updateElapsed, 1000);
    } else {
      setSeconds(timerState.accumulatedSeconds);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState.isRunning, timerState.startTime, timerState.accumulatedSeconds]);

  const handleStart = () => {
    playTone(523.25, 'triangle', 0.12);
    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
    }));
  };

  const handlePause = () => {
    playTone(392.00, 'sine', 0.1);
    const now = Date.now();
    const additional = timerState.startTime ? Math.floor((now - timerState.startTime) / 1000) : 0;
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      startTime: null,
      accumulatedSeconds: prev.accumulatedSeconds + additional,
    }));
  };

  const handleTaskNameChange = (val: string) => {
    // Check if user pasted a GitHub URL
    const parsed = parseGitHubUrl(val);
    if (parsed) {
      setTimerState((prev) => ({
        ...prev,
        taskName: `${parsed.repo} #${parsed.number}`,
        githubUrl: val.trim(),
        project: parsed.repo.includes('tmail') ? 'Tmail Flutter' : parsed.repo.includes('twake') ? 'Twake Mail' : prev.project,
      }));
    } else {
      setTimerState((prev) => ({ ...prev, taskName: val }));
    }
  };

  const handleStopAndSave = () => {
    playTone(659.25, 'sine', 0.15);
    const now = Date.now();
    const additional = timerState.startTime ? Math.floor((now - timerState.startTime) / 1000) : 0;
    const finalSeconds = timerState.accumulatedSeconds + additional;
    const hours = Math.max(0.5, parseFloat((finalSeconds / 3600).toFixed(1))); // At least 0.5h

    if (finalSeconds < 5 && !timerState.taskName.trim()) {
      setTimerState({
        isRunning: false,
        taskName: '',
        project: projects[0] || 'Twake Mail',
        category: 'development',
        startTime: null,
        accumulatedSeconds: 0,
      });
      return;
    }

    onSaveTimeEntry({
      date: formatDateIso(new Date()),
      taskName: timerState.taskName.trim() || 'Công việc vừa làm',
      project: timerState.project || projects[0] || 'Twake Mail',
      category: timerState.category,
      hours: hours,
      durationMinutes: Math.round(hours * 60),
      githubUrl: timerState.githubUrl,
      completionPct: 100,
      gapPct: 0,
      isCompleted: true,
      notes: `Ghi nhận từ đồng hồ (${formatSecondsToTime(finalSeconds)})`,
    });

    setTimerState({
      isRunning: false,
      taskName: '',
      project: timerState.project || projects[0] || 'Twake Mail',
      category: timerState.category,
      startTime: null,
      accumulatedSeconds: 0,
    });
    setSeconds(0);
  };

  return (
    <div className="no-print bg-white border-b border-neutral-200 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Left: Input */}
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Bạn đang làm task gì? (Dán link PR/Issue GitHub hoặc nhập tên task...)"
                value={timerState.taskName}
                onChange={(e) => handleTaskNameChange(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50/50 hover:bg-white transition-colors"
              />
              {timerState.isRunning && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>

            {/* Project dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <select
                  value={timerState.project}
                  onChange={(e) => setTimerState((prev) => ({ ...prev, project: e.target.value }))}
                  className="pl-7 pr-8 py-2 text-xs font-medium border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white appearance-none cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <Folder className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Category */}
              <div className="relative shrink-0">
                <select
                  value={timerState.category}
                  onChange={(e) => setTimerState((prev) => ({ ...prev, category: e.target.value as TaskCategory }))}
                  className="pl-7 pr-8 py-2 text-xs font-medium border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white appearance-none cursor-pointer"
                >
                  {Object.entries(CATEGORY_LABELS).map(([catKey, val]) => (
                    <option key={catKey} value={catKey}>
                      {val.label}
                    </option>
                  ))}
                </select>
                <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Right: Clock & controls */}
          <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
            <div className="flex items-baseline gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-lg">
              <span className="font-mono text-lg font-bold tracking-tight text-neutral-900 tabular-nums">
                {formatSecondsToTime(seconds)}
              </span>
              <span className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider">
                {timerState.isRunning ? 'Đang bấm' : seconds > 0 ? 'Tạm dừng' : 'Chờ'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {!timerState.isRunning ? (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{seconds > 0 ? 'Tiếp tục' : 'Bắt đầu'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-300"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Tạm dừng</span>
                </button>
              )}

              {(timerState.isRunning || seconds > 0) && (
                <button
                  onClick={handleStopAndSave}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current text-rose-500" />
                  <span>Lưu {((seconds || 3600) / 3600).toFixed(1)}h</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
