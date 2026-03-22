'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isTokenValid } from '@/lib/auth';
import { timeLogsApi, projectsApi, Project, TimeLog } from '@/lib/api';
import Navbar from '../components/Navbar';
import TimeChart from './TimeChart';

export default function ReportsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!isTokenValid()) { router.push('/login'); return; }
    projectsApi.list().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isTokenValid()) return;
    setLoading(true);
    timeLogsApi.list({ from, to })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [from, to]);

  // Aggregate time per project
  const byProject: Record<string, number> = {};
  logs.forEach(l => {
    if (l.duration) byProject[l.project_id] = (byProject[l.project_id] || 0) + l.duration;
  });
  const projectData = Object.entries(byProject)
    .map(([pid, secs]) => ({
      name: projects.find(p => p.id === pid)?.name || pid.slice(0, 8),
      hours: Math.round((secs / 3600) * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours);

  // Aggregate time per day
  const byDay: Record<string, number> = {};
  logs.forEach(l => {
    if (l.duration && l.ended_at) {
      const day = l.ended_at.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + l.duration;
    }
  });
  const dayData = Object.entries(byDay)
    .map(([date, secs]) => ({ date, hours: Math.round((secs / 3600) * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalHours = Math.round((logs.reduce((s, l) => s + (l.duration || 0), 0) / 3600) * 10) / 10;

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <Navbar />
      <main className="px-6 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--app-text)' }}>Reports</h1>

        {/* Date range picker */}
        <div className="flex flex-wrap gap-4 items-center mb-8">
          <label className="text-sm flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
            From
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border rounded px-2 py-1 text-sm focus:outline-none"
              style={{ borderColor: 'var(--app-border)', background: 'var(--app-card)', color: 'var(--app-text)' }}
            />
          </label>
          <label className="text-sm flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
            To
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border rounded px-2 py-1 text-sm focus:outline-none"
              style={{ borderColor: 'var(--app-border)', background: 'var(--app-card)', color: 'var(--app-text)' }}
            />
          </label>
          <span className="text-sm font-semibold" style={{ color: 'var(--app-primary)' }}>
            Total: {totalHours}h
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8 opacity-50" style={{ color: 'var(--app-text)' }}>Loading...</div>
        ) : (
          <div className="grid gap-8">
            <div
              className="rounded-lg p-4"
              style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}
            >
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--app-text)' }}>Time by Project</h2>
              <TimeChart type="bar" data={projectData} xKey="name" yKey="hours" />
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}
            >
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--app-text)' }}>Daily Activity</h2>
              <TimeChart type="line" data={dayData} xKey="date" yKey="hours" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
