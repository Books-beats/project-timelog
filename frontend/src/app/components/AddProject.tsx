'use client';
import { useState } from 'react';
import { projectsApi, Project } from '@/lib/api';

interface AddProjectProps {
  onAdd: (p: Project) => void;
}

export default function AddProject({ onAdd }: AddProjectProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [goalHours, setGoalHours] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const goal_seconds = goalHours ? Math.round(parseFloat(goalHours) * 3600) : undefined;
      const project = await projectsApi.create(trimmed, goal_seconds);
      onAdd(project);
      setName(''); setGoalHours(''); setOpen(false);
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setName('');
    setGoalHours('');
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Add a new project"
        className="px-4 py-2 rounded text-white font-semibold cursor-pointer border-none"
        style={{ background: 'var(--app-navbar-gradient)' }}
      >
        + Add Project
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="rounded-lg p-6 w-80 shadow-xl"
            style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--app-text)' }}>New Project</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                placeholder="Project name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="border rounded px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: 'var(--app-border)', background: 'var(--app-bg)', color: 'var(--app-text)' }}
              />
              <input
                placeholder="Goal in hours (optional)"
                type="number"
                min="0"
                step="0.5"
                value={goalHours}
                onChange={e => setGoalHours(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: 'var(--app-border)', background: 'var(--app-bg)', color: 'var(--app-text)' }}
              />
              <div className="flex gap-2 justify-end mt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded text-sm cursor-pointer"
                  style={{ border: '1px solid var(--app-border)', color: 'var(--app-text)', background: 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1.5 rounded text-sm text-white cursor-pointer disabled:opacity-50 border-none"
                  style={{ background: 'var(--app-navbar-gradient)' }}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
