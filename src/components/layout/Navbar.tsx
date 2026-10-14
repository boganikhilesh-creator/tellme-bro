'use client';

import React, { useState } from 'react';
import Link from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Compass,
  MapPin,
  Search,
  User,
  ShieldAlert,
  Edit3,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">Super Admin</span>;
      case 'ADMIN':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Admin</span>;
      case 'EDITOR':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Editor</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <a href="/home" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
                Tellme Bro
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 -mt-1 tracking-wider uppercase">
                Location Social Hub
              </span>
            </div>
          </a>

          {/* Location Indicator (Phase 3 Integration Hook) */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{user?.primaryLocation?.city ? `${user.primaryLocation.city}, India` : 'All Locations (India)'}</span>
            <span className="text-[10px] text-slate-400 underline ml-1">Change</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden lg:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts, reels, categories, locations..."
              className="w-full pl-9 pr-4 py-1.5 text-sm rounded-full bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition"
            />
          </div>
        </div>

        {/* Navigation & User Menu */}
        <div className="flex items-center gap-3">
          <a
            href="/home"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-lg transition"
          >
            Explore
          </a>
          <a
            href="/for-you"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-lg transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            For You
          </a>

          {/* Role Dashboard Quicklinks */}
          {user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <a
              href="/admin"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </a>
          )}

          {user && user.role === 'EDITOR' && (
            <a
              href="/editor"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor Studio</span>
            </a>
          )}

          {/* User Profile / Auth Actions */}
          {!loading && !user && (
            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition"
              >
                Log In
              </a>
              <a
                href="/register"
                className="text-sm font-medium px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition"
              >
                Sign Up
              </a>
            </div>
          )}

          {!loading && user && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {(user.nickname || user.name || 'U')[0]}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                  {user.nickname ? `@${user.nickname}` : user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  onMouseLeave={() => setDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    {user.nickname ? (
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                        @{user.nickname}
                      </p>
                    ) : (
                      <a
                        href="/onboarding/nickname"
                        className="text-[11px] text-amber-500 font-semibold hover:underline block"
                      >
                        + Set Nickname
                      </a>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                    <div className="mt-1.5">{getRoleBadge(user.role)}</div>
                  </div>

                  <div className="py-1">
                    <a
                      href="/profile"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </a>
                    {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                      <a
                        href="/admin"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 font-medium"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Admin Dashboard</span>
                      </a>
                    )}
                    {user.role === 'EDITOR' && (
                      <a
                        href="/editor"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 font-medium"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Editor Studio</span>
                      </a>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
