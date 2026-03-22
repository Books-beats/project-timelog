'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTokenPayload, clearToken } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const router = useRouter();
  const [payload, setPayload] = useState<{ sub: string; email: string } | null>(null);

  useEffect(() => {
    setPayload(getTokenPayload());
  }, []);

  function logout() {
    clearToken();
    router.push('/login');
  }

  async function handleExport() {
    try {
      await projectsApi.export();
    } catch (err) {
      console.error('Export failed', err);
    }
  }

  return (
    <nav
      style={{ background: 'var(--app-navbar-gradient)' }}
      className="w-full px-6 py-3 flex items-center justify-between shadow-md"
    >
      <Link href="/" className="text-white font-bold text-xl no-underline" style={{ textDecoration: 'none' }}>
        Project Timelog ⏱
      </Link>
      <div className="flex items-center gap-4">
        {payload && (
          <>
            <Link href="/reports" className="text-white text-sm hover:underline" style={{ textDecoration: 'none' }}>
              Reports
            </Link>
            <button
              onClick={handleExport}
              title="Export all projects as CSV"
              className="text-white text-sm hover:underline bg-transparent border-none cursor-pointer"
            >
              Export CSV
            </button>
            <span className="text-white text-sm opacity-75 hidden sm:inline">{payload.email}</span>
            <button
              onClick={logout}
              title="Sign out"
              className="text-white text-sm hover:underline bg-transparent border-none cursor-pointer"
            >
              Logout
            </button>
          </>
        )}
        <ThemeToggle />
      </div>
    </nav>
  );
}
