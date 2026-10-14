'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { ALLOWED_EMAIL_DOMAINS } from '@/lib/constants';

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainWarning, setDomainWarning] = useState<string | null>(null);

  // Check email domain in real time
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setError(null);
    if (!val.includes('@')) {
      setDomainWarning(null);
      return;
    }
    const parts = val.toLowerCase().trim().split('@');
    if (parts.length === 2 && parts[1].length > 0) {
      const domain = parts[1];
      if (!(ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain)) {
        setDomainWarning(`Domain "@${domain}" is not permitted. Please use Gmail, Yahoo, Outlook, Rediff, etc.`);
      } else {
        setDomainWarning(null);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (domainWarning) {
      setError(domainWarning);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Registration failed');
        return;
      }

      if (data.data?.devOtp) {
        setDevOtp(data.data.devOtp);
      }

      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Network error during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Verification failed');
        return;
      }

      router.push('/home');
    } catch (err: any) {
      setError(err.message || 'Verification error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Compass className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Create your Tellme Bro account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Join your local community and discover curated posts & reels near you
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 rounded-3xl sm:px-10">

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
                  />
                </div>

                {domainWarning && (
                  <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    {domainWarning}
                  </p>
                )}

                <p className="mt-1.5 text-[10px] text-slate-400">
                  Allowed domains: gmail, yahoo, rediff, outlook, live
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 chars (1 upper, 1 number, 1 special)"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !!domainWarning}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Continue to Verification'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Email OTP Verification */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Verify your email
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  We sent a 6-digit verification code to<br />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>.<br />
                  Please check your email inbox and enter the code below to activate your account.
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono font-bold text-2xl py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Activate Account & Enter'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="w-full text-xs text-slate-500 hover:underline"
                >
                  Change email address
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <a
              href="/login"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Sign in here
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
