'use client';

import React, { useState } from 'react';
import {
  Heart,
  Bookmark,
  Share2,
  Flag,
  Sparkles,
  Zap,
  MapPin,
  Eye,
  Check,
  MoreVertical,
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/social-icons';
import { EmbedRenderer } from '@/components/content/EmbedRenderer';

export interface PostCardProps {
  post: {
    id: string;
    title: string;
    description?: string | null;
    platform: string;
    contentType: string;
    originalUrl: string;
    embedUrl?: string | null;
    thumbnailUrl?: string | null;
    priority?: string;
    viewCount?: number;
    likeCount?: number;
    saveCount?: number;
    isLiked?: boolean;
    isSaved?: boolean;
    createdAt: string | Date;
    categories?: { id: string; name: string; slug: string }[];
    tags?: string[];
    locations?: { city?: string | null; state?: string | null; isAllLocations?: boolean }[];
    createdBy?: { name: string; avatarUrl?: string | null };
    sourceAttr?: string | null;
  };
  onLikeToggle?: (postId: string, newLiked: boolean, newCount: number) => void;
  onSaveToggle?: (postId: string, newSaved: boolean, newCount: number) => void;
}

export function PostCard({ post, onLikeToggle, onSaveToggle }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [saved, setSaved] = useState(post.isSaved || false);
  const [saveCount, setSaveCount] = useState(post.saveCount || 0);
  const [copied, setCopied] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('INAPPROPRIATE');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/v1/posts/${post.id}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setLiked(data.data.isLiked);
        setLikeCount(data.data.likeCount);
        onLikeToggle?.(post.id, data.data.isLiked, data.data.likeCount);
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/v1/posts/${post.id}/save`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(data.data.isSaved);
        setSaveCount(data.data.saveCount);
        onSaveToggle?.(post.id, data.data.isSaved, data.data.saveCount);
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/post/${post.id}` : post.originalUrl;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.description || post.title,
          url,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      const res = await fetch(`/api/v1/posts/${post.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportModalOpen(false);
          setReportSuccess(false);
          setReportDetails('');
        }, 1500);
      }
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const locationLabel = post.locations?.[0]?.isAllLocations
    ? 'All India'
    : post.locations?.[0]?.city
    ? `${post.locations[0].city}${post.locations[0].state ? `, ${post.locations[0].state}` : ''}`
    : 'Local';

  return (
    <article className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
      {/* Header bar: Platform & Priority Badges */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700">
            <SocialIcon platform={post.platform} className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
              {post.platform.toLowerCase()}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">
              {post.contentType.toLowerCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {post.priority === 'ON_DEMAND' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>ON DEMAND</span>
            </span>
          )}

          {post.priority === 'PRIORITY' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>FEATURED</span>
            </span>
          )}

          <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[90px]">{locationLabel}</span>
          </div>
        </div>
      </div>

      {/* Main Content: Social Media Embed / Media Player */}
      <div className="p-3">
        <EmbedRenderer
          platform={post.platform}
          contentType={post.contentType}
          originalUrl={post.originalUrl}
          embedUrl={post.embedUrl}
          thumbnailUrl={post.thumbnailUrl}
          title={post.title}
        />
      </div>

      {/* Body: Title, description, categories */}
      <div className="px-5 py-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <a href={post.originalUrl} target="_blank" rel="noopener noreferrer">
              {post.title}
            </a>
          </h3>

          {post.description && (
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {post.description}
            </p>
          )}

          {/* Categories and Tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.categories?.map((cat) => (
              <span
                key={cat.id}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
              >
                {cat.name}
              </span>
            ))}
            {post.tags?.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400 rounded-md bg-slate-100 dark:bg-slate-800"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Source Attribution & Curated by */}
        {post.sourceAttr && (
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>By {post.sourceAttr}</span>
            {post.createdBy?.name && (
              <span className="text-[10px] text-slate-400">Curated by {post.createdBy.name}</span>
            )}
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition active:scale-125 ${
              liked ? 'text-red-500 font-bold' : 'hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} />
            <span>{likeCount}</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 transition active:scale-125 ${
              saved ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'hover:text-indigo-600'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
            <span>{saveCount}</span>
          </button>

          {/* Views */}
          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <Eye className="w-3.5 h-3.5" />
            <span>{post.viewCount || 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Share */}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            title="Share post"
          >
            {copied ? (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Copied
              </span>
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>

          {/* Report */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition"
            title="Report inappropriate content"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Report Inappropriate Content Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-red-500" />
              <span>Report Content</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Help us keep Tellme Bro safe and high-quality.
            </p>

            {reportSuccess ? (
              <div className="my-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
                <Check className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Report submitted. Thank you!
                </span>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="MISLEADING">Misleading / Fake information</option>
                    <option value="INAPPROPRIATE">Inappropriate / Adult content</option>
                    <option value="COPYRIGHT">Copyright infringement</option>
                    <option value="SPAM">Spam or unwanted advertising</option>
                    <option value="OFFENSIVE">Hate speech or offensive content</option>
                    <option value="OTHER">Other issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Details (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide additional context..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
