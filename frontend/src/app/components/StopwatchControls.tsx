'use client';
import { useState, useEffect, useRef } from 'react';
import { timeLogsApi } from '@/lib/api';

interface StopwatchControlsProps {
  projectId: string;
  totalElapsed: number;
  onElapsedChange: (newTotal: number) => void;
}

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

export default function StopwatchControls({ projectId, totalElapsed, onElapsedChange }: StopwatchControlsProps) {
  const [running, setRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSessionSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  async function handleStart() {
    try {
      const startedAt = new Date().toISOString();
      sessionStartRef.current = new Date();
      const log = await timeLogsApi.start(projectId, startedAt);
      setCurrentLogId(log.id);
      setSessionSeconds(0);
      setRunning(true);
    } catch (err) {
      console.error('Failed to start timer', err);
    }
  }

  async function handlePause() {
    if (!currentLogId || !sessionStartRef.current) return;
    setRunning(false);
    const endedAt = new Date().toISOString();
    const duration = Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000);
    try {
      await timeLogsApi.end(currentLogId, endedAt, duration);
      onElapsedChange(totalElapsed + duration);
      setCurrentLogId(null);
      setSessionSeconds(0);
      sessionStartRef.current = null;
    } catch (err) {
      console.error('Failed to end timer', err);
      setRunning(true);
    }
  }

  async function handleReset() {
    if (running && currentLogId && sessionStartRef.current) {
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      try {
        await timeLogsApi.end(currentLogId, new Date().toISOString(), 0);
      } catch {}
      setCurrentLogId(null);
      sessionStartRef.current = null;
      setSessionSeconds(0);
    }
    try {
      await timeLogsApi.reset(projectId);
      onElapsedChange(0);
    } catch (err) {
      console.error('Failed to reset', err);
    }
  }

  const displaySeconds = totalElapsed + sessionSeconds;

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--app-primary)' }}>
        {fmt(displaySeconds)}
      </span>
      {!running ? (
        <button
          onClick={handleStart}
          title="Start timer"
          className="px-2 py-0.5 rounded text-xs text-white cursor-pointer border-none"
          style={{ background: 'var(--app-primary)' }}
        >
          Start
        </button>
      ) : (
        <button
          onClick={handlePause}
          title="Pause timer"
          className="px-2 py-0.5 rounded text-xs text-white cursor-pointer border-none"
          style={{ background: 'var(--app-accent)' }}
        >
          Pause
        </button>
      )}
      <button
        onClick={handleReset}
        title="Reset all logged time for this project"
        className="px-2 py-0.5 rounded text-xs cursor-pointer"
        style={{ border: '1px solid var(--app-border)', color: 'var(--app-text)', background: 'transparent' }}
      >
        Reset
      </button>
    </div>
  );
}
