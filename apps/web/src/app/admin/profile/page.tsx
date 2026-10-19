'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

// JWT payload returned by GET /api/admin/me (iat / exp are unix seconds)
interface AdminSession {
  id?: string;
  username?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

const formatTimestamp = (seconds?: number) =>
  seconds
    ? new Date(seconds * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

export default function ProfilePage() {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await adminFetch('/api/admin/me');
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && json?.success && json.data) {
          setAdmin(json.data as AdminSession);
        } else {
          setError(json?.error || 'Failed to load the admin session');
        }
      } catch {
        if (!cancelled) setError('Error connecting to server');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const email = admin?.username || '';
  const initial = (email.charAt(0) || 'A').toUpperCase();
  const role = admin?.role ? admin.role.replace(/[_-]+/g, ' ') : 'admin';

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Admin Profile</h1>

        {loading ? (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 text-center text-[#737373]">
            <div className="w-6 h-6 border-2 border-[#d2f000] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading admin session...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-6 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-[#1a1a1a] border border-[#262626] rounded-full flex items-center justify-center mb-4 text-3xl font-bold text-[#d2f000]">
                  {initial}
                </div>
                <h2 className="text-lg font-bold text-white break-all">{email || 'Admin'}</h2>
                <span className="bg-[#d2f000]/10 text-[#d2f000] border border-[#d2f000]/20 px-3 py-1 rounded-full text-xs font-medium mt-3 capitalize">
                  {role}
                </span>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Session */}
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-6">Signed-in Admin</h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-[#a3a3a3] mb-1">Email</dt>
                    <dd className="text-white font-mono break-all">{email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#a3a3a3] mb-1">Role</dt>
                    <dd className="text-white capitalize">{role}</dd>
                  </div>
                  <div>
                    <dt className="text-[#a3a3a3] mb-1">Signed in</dt>
                    <dd className="text-white">{formatTimestamp(admin?.iat)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#a3a3a3] mb-1">Session expires</dt>
                    <dd className="text-white">{formatTimestamp(admin?.exp)}</dd>
                  </div>
                </dl>
              </div>

              {/* Credentials */}
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-3">Email &amp; Password</h2>
                <div className="flex items-start gap-3 text-sm text-[#a3a3a3]">
                  <span className="material-symbols-outlined text-[#d2f000] text-[20px]">info</span>
                  <p>
                    The admin email and password are set with the{' '}
                    <code className="font-mono text-white bg-[#1a1a1a] border border-[#262626] rounded px-1">ADMIN_EMAIL</code> and{' '}
                    <code className="font-mono text-white bg-[#1a1a1a] border border-[#262626] rounded px-1">ADMIN_PASSWORD</code>{' '}
                    environment variables on the server. To change them, update those variables and restart or redeploy
                    the server; they can&apos;t be edited from this page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
