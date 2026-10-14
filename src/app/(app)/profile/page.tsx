'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  CheckCircle,
  Clock,
  LogOut,
  MapPin,
  Save,
  AlertCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, refreshUser, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      setName(user.name);
      setNickname(user.nickname || '');
    }
  }, [user, loading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const cleanNickname = nickname.trim().replace(/^@+/, '');
      const res = await fetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          nickname: cleanNickname || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Update failed');
        return;
      }

      await refreshUser();
      setMessage('Profile updated and saved to database successfully!');
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Profile Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-3xl flex items-center justify-center uppercase shadow-lg shadow-indigo-500/25">
            {user.name[0]}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {user.name}
              </h1>
              {user.nickname && (
                <span className="inline-flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  @{user.nickname}
                </span>
              )}
              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-500">{user.email}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Email Verified
              </span>
              <span className="flex items-center gap-1">
                {user.nickname ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Handle: @{user.nickname}
                  </span>
                ) : (
                  <span className="text-amber-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> No Nickname Set
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                {user.totpEnabled ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" /> 2FA Active
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> 2FA Inactive
                  </span>
                )}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Edit Info Form */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Personal Information & Nickname
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved permanently in the database across sessions and devices.
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              DB Synchronized
            </span>
          </div>

          {message && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Nickname / Handle
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500 font-bold text-sm">
                  @
                </div>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.toLowerCase())}
                  placeholder="cool_bro"
                  className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 outline-none font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Your unique handle across Tellme Bro. Letters, numbers, and underscores only.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address (Permanent)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving to Database...' : 'Save Changes'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
