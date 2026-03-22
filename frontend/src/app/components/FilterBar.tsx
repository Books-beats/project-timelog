import { Tag } from '@/lib/api';

interface FilterBarProps {
  search: string;
  tag: string;
  status: string;
  tags: Tag[];
  filtering: boolean;
  onSearch: (v: string) => void;
  onTag: (v: string) => void;
  onStatus: (v: string) => void;
}

export default function FilterBar({ search, tag, status, tags, filtering, onSearch, onTag, onStatus }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center mb-6">
      <input
        type="text"
        placeholder="Search projects..."
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="border rounded px-3 py-1.5 text-sm focus:outline-none"
        style={{ borderColor: 'var(--app-border)', background: 'var(--app-card)', color: 'var(--app-text)' }}
      />
      <select
        value={tag}
        onChange={e => onTag(e.target.value)}
        className="border rounded px-3 py-1.5 text-sm focus:outline-none"
        style={{ borderColor: 'var(--app-border)', background: 'var(--app-card)', color: 'var(--app-text)' }}
      >
        <option value="">All Tags</option>
        {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
      </select>
      <select
        value={status}
        onChange={e => onStatus(e.target.value)}
        className="border rounded px-3 py-1.5 text-sm focus:outline-none"
        style={{ borderColor: 'var(--app-border)', background: 'var(--app-card)', color: 'var(--app-text)' }}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
      </select>
      {filtering && (
        <span className="text-xs opacity-50" style={{ color: 'var(--app-text)' }}>Filtering...</span>
      )}
    </div>
  );
}
