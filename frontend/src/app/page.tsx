'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isTokenValid } from '@/lib/auth';
import { projectsApi, tagsApi, Project, Tag } from '@/lib/api';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import ProjectGrid from './components/ProjectGrid';
import AddProject from './components/AddProject';
import EmptyState from './components/EmptyState';

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isTokenValid()) { router.push('/login'); return; }
    Promise.all([
      projectsApi.list(),
      tagsApi.list(),
    ]).then(([ps, ts]) => {
      setProjects(ps);
      setAllTags(ts);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchFiltered = useCallback(async (s: string, t: string, st: string) => {
    setFiltering(true);
    try {
      const ps = await projectsApi.list({
        search: s || undefined,
        tag: t || undefined,
        status: st || undefined,
      });
      setProjects(ps);
    } catch (err) { console.error(err); }
    finally { setFiltering(false); }
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => fetchFiltered(search, tag, status), 300);
    return () => clearTimeout(timer);
  }, [search, tag, status, loading, fetchFiltered]);

  function handleUpdate(p: Project) {
    setProjects(prev => prev.map(x => x.id === p.id ? p : x));
  }

  async function handleDelete(id: string) {
    try {
      await projectsApi.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  }

  function handleAdd(p: Project) {
    setProjects(prev => [p, ...prev]);
  }

  function handleNewTag(t: Tag) {
    setAllTags(prev => [...prev, t]);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <div className="text-center" style={{ color: 'var(--app-text)' }}>
          <div className="text-4xl mb-2">⏱</div>
          <p className="opacity-60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <Navbar />
      <main className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>My Projects</h1>
          <AddProject onAdd={handleAdd} />
        </div>
        <FilterBar
          search={search} tag={tag} status={status}
          tags={allTags} filtering={filtering}
          onSearch={setSearch} onTag={setTag} onStatus={setStatus}
        />
        {filtering ? (
          <div className="text-center py-8 opacity-50" style={{ color: 'var(--app-text)' }}>Filtering...</div>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <ProjectGrid
            projects={projects}
            allTags={allTags}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onNewTag={handleNewTag}
          />
        )}
      </main>
    </div>
  );
}
