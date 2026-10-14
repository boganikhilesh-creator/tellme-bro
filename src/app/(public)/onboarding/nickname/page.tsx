'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  User,
  ShieldCheck,
  AtSign,
} from 'lucide-react';

export default function NicknameOnboardingPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  const [nickname, setNickname] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available?: boolean;
    valid?: boolean;
    message?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already loaded and user already has a nickname, redirect to home
  useEffect(() => {
    if (!loading && user?.nickname) {
      router.push('/home');
    }
  }, [user, loading, router]);

  // Live availability check debounce
  useEffect(() => {
    const clean = nickname.trim().replace(/^@+/, '');
    if (!clean) {
      setAvailability(null);
      return;
    }

    if (!/^[a-zA-Z0-9_]{2,30}$/.test(clean)) {
      setAvailability({
        valid: false,
        available: false,
        message: 'Must be 2-30 chars: letters, numbers, and underscores only',
      });
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/v1/auth/nickname?check=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setAvailability(data.data);
        }
      } catch {
        // Silently ignore network hiccup during debounced check
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [nickname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nickname.trim().replace(/^@+/, '');
    if (!clean) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Failed to save nickname');
        return;
      }

      await refreshUser();
      // Redirect to user profile so they see their newly established identity!
      router.push('/profile');
    } catch (err: any) {
      setError(err.message || 'Network error saving nickname');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const cleanNickname = nickname.trim().replace(/^@+/, '');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-900">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/25">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What should we call you?
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            Welcome to Tellme Bro! Choose a unique nickname to personalize your profile, social feed interactions, and comments.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Your Nickname
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500 dark:text-indigo-400 font-bold text-sm">
                @
              </div>
              <input
                type="text"
                autoFocus
                required
                maxLength={30}
                value={nickname}
                onChange={(e) => setNickname(e.target.value.toLowerCase())}
                placeholder="tech_bro"
                className="w-full pl-9 pr-10 py-3 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                {checking ? (
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                ) : availability?.available ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : availability && !availability.available ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>

            {/* Validation Message */}
            {availability?.message && (
              <p
                className={`text-[11px] mt-1.5 font-medium flex items-center gap-1 ${
                  availability.available
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {availability.message}
              </p>
            )}
          </div>

          {/* Profile Card Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Profile Preview
            </span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || 'Your Name'}
                </div>
                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                  {cleanNickname ? `@${cleanNickname}` : '@choose_nickname'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'Signed in via Google'}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              !cleanNickname ||
              availability?.available === false ||
              checking
            }
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/25 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <span>Complete Profile & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Permanently stored in database • You can change it anytime</span>
        </div>
      </div>
    </div>
  );
}
