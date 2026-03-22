'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await authApi.register(email, password);
      setToken(token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full max-w-sm rounded-lg p-8 shadow-md" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--app-text)' }}>Create Account</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--app-text)' }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none"
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text)', background: 'var(--app-bg)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--app-text)' }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none"
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text)', background: 'var(--app-bg)' }} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2 rounded font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--app-navbar-gradient)' }}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center" style={{ color: 'var(--app-text)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--app-accent)' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
