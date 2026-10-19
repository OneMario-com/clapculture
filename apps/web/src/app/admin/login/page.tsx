'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success || !data.data?.token) {
        throw new Error(
          data?.error ||
            (res.status === 429
              ? 'Too many login attempts. Please wait and try again.'
              : res.status >= 500
                ? 'Login is temporarily unavailable. Please try again later.'
                : 'Invalid email or password')
        );
      }

      // Store authenticated JWT token
      localStorage.setItem('adminToken', data.data.token);
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof TypeError
          ? 'Could not reach the server. Check your connection and try again.'
          : err instanceof Error
            ? err.message
            : 'Login failed. Please check credentials.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-white text-3xl font-bold tracking-widest mb-2">CLAP ADMIN</h1>
          <p className="text-[#a3a3a3] text-sm">Sign in to manage your store</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-6 text-center font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a3a3a3] mb-1">Email or Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#d2f000] transition-colors"
              placeholder="xyz@clapculture.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-[#a3a3a3]">Password</label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#d2f000] transition-colors"
              placeholder="•••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#d2f000] text-black font-bold py-3.5 rounded-lg hover:bg-white transition-colors disabled:opacity-50 mt-6 tracking-wider uppercase text-sm"
          >
            {isLoading ? 'VERIFYING...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
}
