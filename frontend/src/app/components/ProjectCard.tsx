'use client';
import { useState, useEffect, useRef } from 'react';
import { Project, Tag, projectsApi, tagsApi } from '@/lib/api';
import StopwatchControls from './StopwatchControls';

const STATUS_COLORS: Record<string, string> = {
  active: '#27ae60',
  paused: '#f39c12',
  completed: '#7f8c8d',
};

interface ProjectCardProps {
  project: Project;
  allTags: Tag[];
  onUpdate: (p: Project) => void;
  onDelete: (id: string) => void;
  onNewTag?: (t: Tag) => void;
}

export default function ProjectCard({ project, allTags, onUpdate, onDelete, onNewTag }: ProjectCardProps) {
  const [nameValue, setNameValue] = useState(project.name);
  const [editing, setEditing] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNameValue(project.name); }, [project.name]);
  useEffect(() => { if (addingTag) tagInputRef.current?.focus(); }, [addingTag]);

  async function saveName() {
    setEditing(false);
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === project.name) { setNameValue(project.name); return; }
    try {
      const updated = await projectsApi.update(project.id, { name: trimmed });
      onUpdate(updated);
    } catch { setNameValue(project.name); }
  }

  async function setStatus(status: Project['status']) {
    try {
      const updated = await projectsApi.update(project.id, { status });
      onUpdate(updated);
    } catch { console.error('Failed to update status'); }
  }

  async function addTag() {
    const name = tagInput.trim();
    if (!name) { setAddingTag(false); return; }
    setTagInput(''); setAddingTag(false);
    try {
      let tag = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
      let isNew = false;
      if (!tag) { tag = await tagsApi.create(name); isNew = true; }
      const updated = await tagsApi.attachToProject(project.id, tag.id);
      onUpdate(updated);
      if (isNew && onNewTag) onNewTag(tag);
    } catch (err) { console.error('Failed to add tag', err); }
  }

  async function removeTag(tagId: string) {
    try {
      await tagsApi.removeFromProject(project.id, tagId);
      onUpdate({ ...project, tags: project.tags.filter(t => t.id !== tagId) });
    } catch { console.error('Failed to remove tag'); }
  }

  const goalPct = project.goal_seconds && project.goal_seconds > 0
    ? Math.min(100, Math.round((project.total_elapsed / project.goal_seconds) * 100))
    : null;

  return (
    <div
      className="rounded-lg p-4 shadow-sm flex flex-col gap-3"
      style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}
    >
      {/* Header: name + delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') { setEditing(false); setNameValue(project.name); }
              }}
              className="font-semibold text-sm w-full border-b focus:outline-none bg-transparent"
              style={{ borderColor: 'var(--app-primary)', color: 'var(--app-text)' }}
            />
          ) : (
            <span
              className="font-semibold text-sm cursor-pointer hover:opacity-75 block truncate"
              style={{ color: 'var(--app-text)' }}
              onClick={() => setEditing(true)}
              title="Click to rename"
            >
              {project.name}
            </span>
          )}
        </div>
        <button
          title="Delete this project"
          onClick={() => { if (confirm(`Delete "${project.name}"?`)) onDelete(project.id); }}
          className="text-xs opacity-40 hover:opacity-100 cursor-pointer bg-transparent border-none shrink-0"
          style={{ color: 'var(--app-text)' }}
        >
          ✕
        </button>
      </div>

      {/* Status badge + select */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
          style={{ background: STATUS_COLORS[project.status] || '#999' }}
        >
          {project.status}
        </span>
        <select
          value={project.status}
          onChange={e => setStatus(e.target.value as Project['status'])}
          title="Change project status"
          className="text-xs border rounded px-1 py-0.5 cursor-pointer focus:outline-none"
          style={{ borderColor: 'var(--app-border)', background: 'var(--app-card)', color: 'var(--app-text)' }}
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Goal progress bar */}
      {goalPct !== null && (
        <div>
          <div className="flex justify-between text-xs mb-1 opacity-70" style={{ color: 'var(--app-text)' }}>
            <span>Goal progress</span>
            <span>{goalPct}%</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: 'var(--app-border)' }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${goalPct}%`, background: 'var(--app-primary)' }}
            />
          </div>
        </div>
      )}

      {/* Stopwatch */}
      <StopwatchControls
        projectId={project.id}
        totalElapsed={project.total_elapsed}
        onElapsedChange={secs => onUpdate({ ...project, total_elapsed: secs })}
      />

      {/* Tags */}
      <div className="flex flex-wrap gap-1 items-center">
        {project.tags.map(t => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--app-border)', color: 'var(--app-text)' }}
          >
            {t.name}
            <button
              title={`Remove tag "${t.name}"`}
              onClick={() => removeTag(t.id)}
              className="leading-none opacity-60 hover:opacity-100 cursor-pointer bg-transparent border-none text-xs"
            >
              ×
            </button>
          </span>
        ))}
        {addingTag ? (
          <input
            ref={tagInputRef}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onBlur={addTag}
            onKeyDown={e => {
              if (e.key === 'Enter') addTag();
              if (e.key === 'Escape') { setAddingTag(false); setTagInput(''); }
            }}
            placeholder="tag name"
            className="text-xs border rounded px-2 py-0.5 focus:outline-none w-24"
            style={{ borderColor: 'var(--app-primary)', background: 'var(--app-card)', color: 'var(--app-text)' }}
          />
        ) : (
          <button
            title="Add a tag to this project"
            onClick={() => setAddingTag(true)}
            className="text-xs px-2 py-0.5 rounded-full cursor-pointer"
            style={{ border: '1px solid var(--app-border)', color: 'var(--app-text)', background: 'transparent' }}
          >
            + tag
          </button>
        )}
      </div>
    </div>
  );
}
