'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Email-based 2FA Verification states
  const [requires2fa, setRequires2fa] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [oauthModalOpen, setOauthModalOpen] = useState<'google' | 'facebook' | null>(null);
  const [googleEmail, setGoogleEmail] = useState('alex.google@gmail.com');
  const [googleName, setGoogleName] = useState('Alex Kumar');

  // Handle standard email + password login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If email not verified, prompt user
        if (data.error?.code === 'EMAIL_NOT_VERIFIED') {
          setError(
            `${data.error.message} ${
              data.error.details?.devOtp
                ? `(Dev OTP: ${data.error.details.devOtp})`
                : ''
            }`
          );
          return;
        }
        setError(data.error?.message || 'Invalid email or password');
        return;
      }

      // Check if Email 2FA is required (for Admin / Staff / 2FA-enabled accounts)
      if (data.data?.requires2fa) {
        setTempToken(data.data.tempToken);
        setTargetEmail(data.data.email || email);
        if (data.data.devOtp) {
          setDevOtp(data.data.devOtp);
        }
        setRequires2fa(true);
        return;
      }

      // Normal login success
      await refreshUser();
      if (data.data?.user?.role === 'SUPER_ADMIN' || data.data?.user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (data.data?.user?.role === 'EDITOR') {
        router.push('/editor');
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP challenge code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: otpCode.trim(),
          tempToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Invalid verification code');
        return;
      }

      // Login completed successfully
      await refreshUser();
      if (data.data?.user?.role === 'SUPER_ADMIN' || data.data?.user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (data.data?.user?.role === 'EDITOR') {
        router.push('/editor');
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Email OTP
  const handleResendOtp = async () => {
    if (!tempToken || resending) return;
    setError(null);
    setResending(true);

    try {
      const res = await fetch('/api/v1/auth/2fa/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.data?.message || 'A new verification code has been sent to your email.');
        if (data.data?.devOtp) {
          setDevOtp(data.data.devOtp);
        }
      } else {
        setError(data.error?.message || 'Failed to resend code');
      }
    } catch (err: any) {
      setError('Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      {/* Background aesthetic glow */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-4 font-black text-xl">
            TB
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Tellme Bro
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {requires2fa
              ? 'Email Verification Required'
              : 'Sign in to access your curated local feed & portal'}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {successMsg}
              </div>
            </div>
          )}

          {!requires2fa ? (
            /* Standard Login Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-2xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative rounded-2xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-50"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-semibold tracking-wider">
                    Or sign in with
                  </span>
                </div>
              </div>

              {/* OAuth buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOauthModalOpen('google')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z"
                    />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => setOauthModalOpen('facebook')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition"
                >
                  <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
              </div>
            </form>
          ) : (
            /* Email-based 2FA Verification View */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3 shadow-inner">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Enter Verification Code
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  We've sent a 6-digit security OTP code to<br />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{targetEmail}</span>.<br />
                  Please check your email inbox and enter the code below.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 text-center">
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="------"
                    className="w-full text-center tracking-[0.4em] font-mono font-bold text-2xl py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Resending...' : 'Resend Code'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequires2fa(false);
                      setTempToken(null);
                      setOtpCode('');
                      setError(null);
                    }}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                  >
                    Back to email login
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <a
              href="/register"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Sign up for free
            </a>
          </div>
        </div>
      </div>

      {/* OAuth Integration Modal */}
      {oauthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl">
            {oauthModalOpen === 'google' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Sign in with Google
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Persistent database account & nickname setup
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  👋 <strong>Nickname Onboarding:</strong> Upon signing in with Google, Tellme Bro will ask what nickname to call you and build your persistent profile handle.
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Google Account Email
                    </label>
                    <input
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="alex.google@gmail.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Full Name (from Google Profile)
                    </label>
                    <input
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      placeholder="Alex Kumar"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      const emailParam = encodeURIComponent(googleEmail.trim() || 'google.user@gmail.com');
                      const nameParam = encodeURIComponent(googleName.trim() || 'Google User');
                      window.location.href = `/api/v1/auth/oauth/google?action=demo&email=${emailParam}&name=${nameParam}`;
                    }}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition"
                  >
                    Continue & Set Nickname →
                  </button>
                  <button
                    onClick={() => setOauthModalOpen(null)}
                    className="py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                  Facebook Login Integration
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  In accordance with project rules, external OAuth services require client credentials in your <code className="text-indigo-500">.env</code> file:
                </p>

                <div className="my-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  FACEBOOK_APP_ID=&lt;your-app-id&gt;<br />
                  FACEBOOK_APP_SECRET=&lt;your-secret&gt;
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      window.location.href = `/api/v1/auth/oauth/facebook?action=demo`;
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                  >
                    Simulate 1-Click Facebook Sign-In
                  </button>
                  <button
                    onClick={() => setOauthModalOpen(null)}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
