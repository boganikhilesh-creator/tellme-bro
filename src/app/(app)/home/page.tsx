'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  MapPin,
  TrendingUp,
  Sparkles,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/social-icons';
import { PostCard } from '@/components/content/PostCard';

export default function HomePage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load categories
  useEffect(() => {
    fetch('/api/v1/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.categories) {
          setCategories(data.data.categories);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch posts from API
  const fetchPosts = async (resetPage = false) => {
    const targetPage = resetPage ? 1 : page;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', targetPage.toString());
      params.set('limit', '12');

      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }
      if (selectedPlatform !== 'ALL') {
        params.set('platform', selectedPlatform);
      }
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/v1/posts?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setPosts(data.data.posts);
        setTotalPages(data.data.pagination.totalPages);
        if (resetPage) setPage(1);
      }
    } catch (err) {
      console.error('Fetch feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(true);
  }, [selectedCategory, selectedPlatform]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts(true);
  };

  // Find top priority featured post for hero banner
  const featuredPost = posts.find((p) => p.priority === 'ON_DEMAND' || p.priority === 'PRIORITY');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Hero Community Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-900/10 via-slate-50 to-slate-50 dark:from-indigo-950/20 dark:via-slate-950 dark:to-slate-950 border-b border-slate-200/60 dark:border-slate-800/60 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-3 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Location-Aware Social Feed</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {user?.nickname ? (
                <>
                  Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-amber-500 bg-clip-text text-transparent">@{user.nickname}</span>
                </>
              ) : (
                <>
                  What's happening around you, <span className="bg-gradient-to-r from-indigo-600 to-amber-500 bg-clip-text text-transparent">curated for you</span>
                </>
              )}
            </h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tellme Bro handpicks top Instagram reels, YouTube shorts, Facebook stories, and LinkedIn insights tailored to your locality and interests.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Region</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {user?.primaryLocation?.city ? `${user.primaryLocation.city}, India` : 'All India (National Feed)'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Search & Platform Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* Keyword Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, topics, #tags..."
              className="w-full pl-10 pr-20 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition"
            >
              Search
            </button>
          </form>

          {/* Social Platform Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
            {['ALL', 'INSTAGRAM', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN'].map((p) => {
              const isSelected = selectedPlatform === p;
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {p !== 'ALL' && <SocialIcon platform={p} className="w-3.5 h-3.5" />}
                  <span>{p === 'ALL' ? 'All Platforms' : p.charAt(0) + p.slice(1).toLowerCase()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            🔥 All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition ${
                selectedCategory === cat.slug
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Pinned Featured Post Banner if available */}
        {featuredPost && selectedCategory === 'all' && selectedPlatform === 'ALL' && !searchQuery && (
          <div className="my-6 p-6 rounded-3xl bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-amber-900/10 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold border border-amber-500/20">
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Pinned Spotlight Story</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {featuredPost.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {featuredPost.description || 'Trending high-priority curated social content.'}
              </p>
            </div>
            <a
              href={featuredPost.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition shrink-0"
            >
              Watch Original Spotlight
            </a>
          </div>
        )}

        {/* Live Feed Header */}
        <div className="mt-8 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedCategory === 'all' ? 'Latest Curated Feeds' : `${selectedCategory.toUpperCase()} Feed`}
            </h2>
          </div>
          <button
            onClick={() => fetchPosts(false)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <span className="text-xs font-medium">Fetching curated social content...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 mx-auto flex items-center justify-center mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No posts found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no published social posts matching your current filters. Try selecting another category or platform.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeToggle={(id, liked, count) => {
                  setPosts((prev) =>
                    prev.map((p) => (p.id === id ? { ...p, isLiked: liked, likeCount: count } : p))
                  );
                }}
                onSaveToggle={(id, saved, count) => {
                  setPosts((prev) =>
                    prev.map((p) => (p.id === id ? { ...p, isSaved: saved, saveCount: count } : p))
                  );
                }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                if (page > 1) {
                  setPage((p) => p - 1);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }
              }}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => {
                if (page < totalPages) {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }
              }}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
