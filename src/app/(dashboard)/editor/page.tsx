'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Edit3,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Send,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/social-icons';
import { PostFormModal } from '@/components/content/PostFormModal';

export default function EditorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Protect route: requires EDITOR, ADMIN, or SUPER_ADMIN
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'EDITOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchMyPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('mine', 'true');
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/v1/posts?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(data.data.posts);
      }
    } catch (err) {
      console.error('Fetch editor posts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyPosts();
    }
  }, [user, statusFilter]);

  const handleSubmitForReview = async (postId: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/v1/posts/${postId}/submit`, { method: 'POST' });
      if (res.ok) {
        fetchMyPosts();
      }
    } catch (err) {
      console.error('Submit for review error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/v1/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMyPosts();
      }
    } catch (err) {
      console.error('Delete post error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const counts = {
    total: posts.length,
    pending: posts.filter((p) => p.status === 'PENDING').length,
    published: posts.filter((p) => p.status === 'PUBLISHED').length,
    rejected: posts.filter((p) => p.status === 'REJECTED').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  ✍️ Content Curator Studio
                </span>
                <span className="text-xs text-slate-400">Editor Role Authenticated</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Staff Editorial Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Curate Instagram, Facebook, YouTube, and LinkedIn posts & reels for location-based feeds.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Curate New Post</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Editorial Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{counts.total}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">My Curated Posts</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{counts.pending}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Pending Review</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{counts.published}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Published & Live</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{counts.rejected}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Returned with Notes</div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All Posts' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'PENDING', label: 'Pending Review' },
              { id: 'PUBLISHED', label: 'Published' },
              { id: 'REJECTED', label: 'Needs Revision' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchMyPosts}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <span className="text-xs font-medium">Loading your submissions...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No submissions found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
              You haven't curated any posts matching this filter. Start by curating a trending social post!
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              Curate First Post
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const latestApproval = post.approvals?.[0];
              const isRejected = post.status === 'REJECTED';

              return (
                <div
                  key={post.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0">
                      <SocialIcon platform={post.platform} className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            post.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : post.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : post.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {post.status}
                        </span>

                        <span className="text-[11px] text-slate-400 capitalize">
                          {post.platform.toLowerCase()} • {post.contentType.toLowerCase()}
                        </span>

                        {post.priority !== 'STANDARD' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                            {post.priority}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {post.title}
                      </h4>

                      {/* Rejection Feedback Note */}
                      {isRejected && latestApproval?.reason && (
                        <div className="mt-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Reviewer Note:</strong> {latestApproval.reason}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Views: {post.viewCount || 0}</span>
                        <span>Likes: {post.likeCount || 0}</span>
                        <span>Saves: {post.saveCount || 0}</span>
                        <a
                          href={post.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-indigo-600 flex items-center gap-1"
                        >
                          <span>Open link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {(post.status === 'DRAFT' || post.status === 'REJECTED') && (
                      <button
                        onClick={() => handleSubmitForReview(post.id)}
                        disabled={actionLoading === post.id}
                        className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for Review</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeletePost(post.id)}
                      disabled={actionLoading === post.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post Curation Modal */}
      <PostFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          fetchMyPosts();
        }}
        isAdmin={user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'}
      />
    </div>
  );
}
