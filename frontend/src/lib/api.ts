const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

import { getToken } from './auth';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(body.error || 'Request failed'), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  register: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
};

export type Project = {
  id: string; name: string; status: 'active' | 'paused' | 'completed';
  goal_seconds: number | null; created_at: string;
  total_elapsed: number; tags: { id: string; name: string }[];
};

export const projectsApi = {
  list: (params?: { search?: string; tag?: string; status?: string }) => {
    const clean = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      : {};
    const q = Object.keys(clean).length ? '?' + new URLSearchParams(clean as Record<string, string>).toString() : '';
    return request<Project[]>(`/projects${q}`);
  },
  create: (name: string, goal_seconds?: number) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify({ name, goal_seconds }) }),
  update: (id: string, fields: Partial<Pick<Project, 'name' | 'status' | 'goal_seconds'>>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(fields) }),
  delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  export: async () => {
    const res = await fetch(`${BASE_URL}/projects/export`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};

export type TimeLog = {
  id: string; project_id: string; user_id: string;
  started_at: string; ended_at: string | null; duration: number | null;
};

export const timeLogsApi = {
  start: (project_id: string, started_at: string) =>
    request<TimeLog>('/time-logs', { method: 'POST', body: JSON.stringify({ project_id, started_at }) }),
  end: (id: string, ended_at: string, duration: number) =>
    request<TimeLog>(`/time-logs/${id}`, { method: 'PUT', body: JSON.stringify({ ended_at, duration }) }),
  list: (params?: { project_id?: string; from?: string; to?: string }) => {
    const clean = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      : {};
    const q = Object.keys(clean).length ? '?' + new URLSearchParams(clean as Record<string, string>).toString() : '';
    return request<TimeLog[]>(`/time-logs${q}`);
  },
  reset: (project_id: string) =>
    request<void>(`/time-logs?project_id=${project_id}`, { method: 'DELETE' }),
};

export type Tag = { id: string; name: string };

export const tagsApi = {
  list: () => request<Tag[]>('/tags'),
  create: (name: string) => request<Tag>('/tags', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id: string) => request<void>(`/tags/${id}`, { method: 'DELETE' }),
  attachToProject: (projectId: string, tag_id: string) =>
    request<Project>(`/projects/${projectId}/tags`, { method: 'POST', body: JSON.stringify({ tag_id }) }),
  removeFromProject: (projectId: string, tagId: string) =>
    request<void>(`/projects/${projectId}/tags/${tagId}`, { method: 'DELETE' }),
};
