'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Activity,
  Layers,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Inbox,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  FolderTree,
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/social-icons';
import { EmbedRenderer } from '@/components/content/EmbedRenderer';

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'categories' | 'users' | 'audit'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Users filter states
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review modal state
  const [rejectModalOpen, setRejectModalOpen] = useState<{ postId: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Category modal states
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catParentId, setCatParentId] = useState('');
  const [catOrder, setCatOrder] = useState(0);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Protect route
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, auditRes, pendingRes, catsRes] = await Promise.all([
        fetch('/api/v1/admin/dashboard'),
        fetch(`/api/v1/admin/users?search=${encodeURIComponent(userSearch)}&role=${roleFilter}`),
        fetch('/api/v1/admin/audit-logs?limit=25'),
        fetch('/api/v1/posts/pending'),
        fetch('/api/v1/categories'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data?.stats);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsersList(data.data?.users || []);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.data?.logs || []);
      }
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingQueue(data.data?.queue || []);
      }
      if (catsRes.ok) {
        const data = await catsRes.json();
        setCategories(data.data?.categories || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
      fetchDashboardData();
    }
  }, [user, userSearch, roleFilter]);

  // Handle post approval
  const handleApprovePost = async (postId: string, priority = 'STANDARD') => {
    try {
      const res = await fetch(`/api/v1/posts/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Post approved and published to live feed!' });
        fetchDashboardData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Approval failed' });
    }
  };

  // Handle post rejection
  const handleRejectPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalOpen || !rejectReason.trim()) return;
    setRejectSubmitting(true);
    try {
      const res = await fetch(`/api/v1/posts/${rejectModalOpen.postId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Post rejected with feedback returned to editor.' });
        setRejectModalOpen(null);
        setRejectReason('');
        fetchDashboardData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Rejection failed' });
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Handle category save (Create or Edit)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCatId ? `/api/v1/categories/${editingCatId}` : '/api/v1/categories';
      const method = editingCatId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName.trim(),
          description: catDesc.trim() || null,
          parentId: catParentId || null,
          displayOrder: Number(catOrder) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error?.message || 'Category save failed' });
        return;
      }

      setActionMessage({ type: 'success', text: editingCatId ? 'Category updated' : 'Category created' });
      setCatModalOpen(false);
      setEditingCatId(null);
      setCatName('');
      setCatDesc('');
      setCatParentId('');
      setCatOrder(0);
      fetchDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error saving category' });
    }
  };

  // Handle category delete
  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Are you sure you want to delete or deactivate this category?')) return;
    try {
      const res = await fetch(`/api/v1/categories/${catId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.data?.message || 'Category deleted' });
        fetchDashboardData();
      } else {
        setActionMessage({ type: 'error', text: data.error?.message || 'Delete failed' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error deleting category' });
    }
  };

  // Handle role change with RBAC validation feedback
  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error?.message || 'Role change failed' });
        return;
      }

      setActionMessage({ type: 'success', text: data.data?.message || 'Role updated successfully' });
      fetchDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error updating role' });
    }
  };

  // Handle status toggle (Activate / Deactivate)
  const handleStatusToggle = async (targetUserId: string, currentStatus: boolean) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${targetUserId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error?.message || 'Status update failed' });
        return;
      }

      setActionMessage({ type: 'success', text: data.data?.message || 'Status updated' });
      fetchDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error updating user status' });
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {user?.role === 'SUPER_ADMIN' ? '👑 Super Admin Console' : '🛡️ Platform Admin Console'}
                </span>
                <span className="text-xs text-slate-400">Strict Server RBAC Enforced</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Governance & Control Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Content review queue, category management, user administration, and security audit log.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboardData}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 -mb-8 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              System Overview
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'review'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Content Review Queue</span>
              {pendingQueue.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
                  {pendingQueue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Category Management
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              User & Role Management
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Immutable Audit Logs
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Flash Message Banner */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: SYSTEM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats?.usersCount || usersList.length}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Total Registered Accounts</div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {pendingQueue.length}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Pending Review Queue</div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {categories.length}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Active Content Categories</div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {auditLogs.length}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Audited Security Events</div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-slate-900/5 border border-indigo-200/80 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Phase 2 Content & Governance Active
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 max-w-2xl leading-relaxed">
                Staff editors submit Instagram reels, YouTube shorts, Facebook videos, and LinkedIn posts for review. Admins approve with feed priority or reject with mandatory guidance.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('review')}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition"
                >
                  Inspect Review Queue ({pendingQueue.length})
                </button>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition"
                >
                  Manage Categories
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT REVIEW QUEUE */}
        {activeTab === 'review' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-indigo-600" />
                  <span>Pending Content Approvals</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Review submitted social media posts before they appear on public location-based feeds.
                </p>
              </div>
            </div>

            {pendingQueue.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Review queue is empty</h4>
                <p className="text-xs text-slate-500 mt-1">All curated submissions have been processed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingQueue.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 shrink-0">
                        <SocialIcon platform={post.platform} className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            PENDING REVIEW
                          </span>
                          <span className="text-[11px] text-slate-400 capitalize">
                            {post.platform.toLowerCase()} • {post.contentType.toLowerCase()}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Curated by: <strong>{post.createdBy?.name}</strong> ({post.createdBy?.email})
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {post.title}
                        </h4>

                        {post.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {post.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          <a
                            href={post.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <span>Inspect source URL</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Decision Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleApprovePost(post.id, 'STANDARD')}
                        className="inline-flex items-center gap-1 py-2 px-3.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleApprovePost(post.id, 'PRIORITY')}
                        className="inline-flex items-center gap-1 py-2 px-3 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 hover:bg-indigo-200 transition"
                        title="Approve and feature as Priority"
                      >
                        <span>Approve & Feature</span>
                      </button>

                      <button
                        onClick={() => setRejectModalOpen({ postId: post.id, title: post.title })}
                        className="inline-flex items-center gap-1 py-2 px-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CATEGORY MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-indigo-600" />
                  <span>Category Hierarchy Management</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Organize root categories and subcategories with custom display order.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCatId(null);
                  setCatName('');
                  setCatDesc('');
                  setCatParentId('');
                  setCatOrder(categories.length + 1);
                  setCatModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {cat.name}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        /{cat.slug}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                        {cat._count?.postCategories || 0} posts
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        {cat.description}
                      </p>
                    )}

                    {/* Subcategories */}
                    {cat.children && cat.children.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-semibold">Subcategories:</span>
                        {cat.children.map((sub: any) => (
                          <span
                            key={sub.id}
                            className="px-2 py-0.5 text-[10px] rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setCatName(cat.name);
                        setCatDesc(cat.description || '');
                        setCatParentId(cat.parentId || '');
                        setCatOrder(cat.displayOrder || 0);
                        setCatModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  User Account Administration
                </h3>
                <p className="text-xs text-slate-500">
                  Manage platform access, roles (SUPER_ADMIN, ADMIN, EDITOR, USER), and account active status.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">All Roles</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="EDITOR">Editor</option>
                  <option value="USER">User</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 px-3">User</th>
                    <th className="pb-3 px-3">Role</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Security</th>
                    <th className="pb-3 px-3">Joined</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usersList.map((u) => {
                    const isSelf = u.id === user?.id;
                    const canModify = user?.role === 'SUPER_ADMIN' || (user?.role === 'ADMIN' && u.role !== 'SUPER_ADMIN' && u.role !== 'ADMIN');

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </td>

                        <td className="py-3 px-3">
                          {canModify && !isSelf ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="text-xs p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                            >
                              <option value="USER">USER</option>
                              <option value="EDITOR">EDITOR</option>
                              <option value="ADMIN">ADMIN</option>
                              {user?.role === 'SUPER_ADMIN' && (
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              )}
                            </select>
                          ) : (
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {u.role}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-[11px] text-slate-500">
                          {u.emailVerified ? 'Verified Email' : 'Unverified'}
                        </td>

                        <td className="py-3 px-3 text-[11px] text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {canModify && !isSelf ? (
                            <button
                              onClick={() => handleStatusToggle(u.id, u.isActive)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                u.isActive
                                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Security & Administrative Audit Trail
                </h3>
                <p className="text-xs text-slate-500">
                  Every privileged action, role change, and security event is permanently recorded with actor telemetry.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Actor</th>
                    <th className="pb-3 px-3">Action</th>
                    <th className="pb-3 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {log.actor?.name || 'System / Bootstrap'}
                        </div>
                        <div className="text-[10px] text-slate-400">{log.actor?.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span>Return Post to Editor</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Provide feedback explaining why "{rejectModalOpen.title}" needs revision:
            </p>

            <form onSubmit={handleRejectPost} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Revision Guidance / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Please update category to Business or fix typo in title headline."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(null)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting || rejectReason.trim().length < 3}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
                >
                  {rejectSubmitting ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal (Create / Edit) */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {editingCatId ? 'Edit Category' : 'Create New Category'}
            </h4>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Technology"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Category scope and topics..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Category (optional for subcategories)
                </label>
                <select
                  value={catParentId}
                  onChange={(e) => setCatParentId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={catOrder}
                  onChange={(e) => setCatOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
