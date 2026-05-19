'use client';
// src/app/(auth)/login/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Spinner } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, _hasHydrated } = useAuthStore();  // ✅ _hasHydrated add kiya
  const [email, setEmail]     = useState('admin@yogveda.com');
  const [password, setPass]   = useState('Admin@123');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShow]   = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;        // ✅ wait karo
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, _hasHydrated]);    // ✅ _hasHydrated dependency add kiya

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    setLoading(true); setError('');
    try {
      const res: any = await authAPI.login({ email: email.toLowerCase(), password });
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0D2018 0%, #162B20 50%, #1E3D2C 100%)' }}
    >
      {/* Background circles */}
      {[300, 500, 700, 900].map((s) => (
        <div key={s} className="absolute rounded-full border border-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: s, height: s }} />
      ))}

      <div className="bg-white rounded-3xl p-10 w-full max-w-sm shadow-[0_30px_80px_rgba(0,0,0,0.35)] relative z-10" style={{ animation: 'slideUp 0.4s both' }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">🌿</div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Yogveda CRM</h1>
          <p className="text-xs text-gray-500 mt-1">Healthcare Lead Management Platform</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5 rounded-lg mb-4 flex items-center gap-2">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="form-input" placeholder="admin@yogveda.com" autoComplete="email" autoFocus
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} value={password}
                onChange={(e) => setPass(e.target.value)}
                className="form-input pr-10" placeholder="••••••••" autoComplete="current-password"
              />
              <button type="button" onClick={() => setShow(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? '👁' : '👁‍🗨'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="btn btn-primary w-full justify-center py-2.5 text-sm mt-2">
            {loading ? <><Spinner size={14} /> Signing in…</> : 'Sign in to CRM'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-400">
          <div className="mb-1 font-medium text-gray-500">Demo credentials</div>
          <div>Admin: admin@yogveda.com / Admin@123</div>
          <div>Sales: sales@yogveda.com / Sales@123</div>
        </div>
      </div>
    </div>
  );
}
