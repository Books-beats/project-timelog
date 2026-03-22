'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="text-white text-sm rounded px-2 py-1 cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.2)' }}
    >
      {isDark ? '☀' : '☾'}
    </button>
  );
}
