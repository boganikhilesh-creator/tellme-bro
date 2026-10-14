'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Link as LinkIcon,
  Sparkles,
  Zap,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/social-icons';
import { EmbedRenderer } from '@/components/content/EmbedRenderer';

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (post: any) => void;
  isAdmin?: boolean;
}

export function PostFormModal({ isOpen, onClose, onSuccess, isAdmin = false }: PostFormModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceAttr, setSourceAttr] = useState('');
  const [platform, setPlatform] = useState<string>('INSTAGRAM');
  const [contentType, setContentType] = useState<string>('POST');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [priority, setPriority] = useState<string>('STANDARD');
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isAllLocations, setIsAllLocations] = useState(true);

  const [detecting, setDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available categories
  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/categories')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.categories) {
            setCategories(data.data.categories);
            if (data.data.categories.length > 0 && selectedCategoryIds.length === 0) {
              setSelectedCategoryIds([data.data.categories[0].id]);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Auto-detect URL metadata when URL changes
  const handleDetectUrl = async (urlToDetect: string) => {
    if (!urlToDetect || !urlToDetect.startsWith('http')) return;
    setDetecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/posts/detect-url?url=${encodeURIComponent(urlToDetect.trim())}`);
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setPlatform(data.data.platform);
        setContentType(data.data.contentType);
        setEmbedUrl(data.data.embedUrl);
      } else {
        setError(data.error?.message || 'Unsupported social media link');
      }
    } catch (err: any) {
      setError('Could not inspect social link');
    } finally {
      setDetecting(false);
    }
  };

  const handleCategoryToggle = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      if (selectedCategoryIds.length > 1) {
        setSelectedCategoryIds(selectedCategoryIds.filter((cid) => cid !== id));
      }
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'PENDING' | 'PUBLISHED') => {
    setError(null);
    if (!url.trim()) {
      setError('Please provide a valid social media URL');
      return;
    }
    if (!title.trim() || title.length < 3) {
      setError('Please provide a title (at least 3 characters)');
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const payload = {
        originalUrl: url.trim(),
        title: title.trim(),
        description: description.trim() || null,
        sourceAttr: sourceAttr.trim() || null,
        platform,
        contentType,
        priority,
        categoryIds: selectedCategoryIds,
        tags,
        status: targetStatus,
        locations: [
          {
            city: isAllLocations ? null : city.trim() || null,
            state: isAllLocations ? null : state.trim() || null,
            isAllLocations,
          },
        ],
      };

      const res = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Failed to create post');
        return;
      }

      onSuccess(data.data.post);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating post');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Curate Social Media Content
            </h3>
            <p className="text-xs text-slate-500">
              Share posts, reels, shorts & articles across your target geography
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Social URL input with detection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Social Media URL *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="h-4 w-4" />
              </div>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (e.target.value.includes('instagram.com') || e.target.value.includes('youtube.com') || e.target.value.includes('youtu.be') || e.target.value.includes('facebook.com') || e.target.value.includes('linkedin.com')) {
                    handleDetectUrl(e.target.value);
                  }
                }}
                onBlur={() => handleDetectUrl(url)}
                placeholder="https://www.instagram.com/reel/... or https://youtu.be/..."
                className="block w-full pl-9 pr-24 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleDetectUrl(url)}
                disabled={detecting || !url}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1"
              >
                {detecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <SocialIcon platform={platform} className="w-3 h-3" />
                    <span>Detect</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
              <span>Detected: <strong className="text-slate-700 dark:text-slate-200 uppercase">{platform}</strong> ({contentType})</span>
            </div>
          </div>

          {/* Embed Preview if detected */}
          {embedUrl && (
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Live Embed Preview
              </span>
              <div className="max-h-[300px] overflow-hidden rounded-xl">
                <EmbedRenderer
                  platform={platform}
                  contentType={contentType}
                  originalUrl={url}
                  embedUrl={embedUrl}
                  title={title || 'Preview Post'}
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Title / Caption Headline *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Catchy, informative headline for feed discovery"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Summary / Notes (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key insights, summary, or highlights..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Categories Pill Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Categories *
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority & Source Attribution */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Feed Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="STANDARD">Standard</option>
                <option value="PRIORITY">Priority (Featured)</option>
                <option value="ON_DEMAND">On Demand (Top Pin)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Creator / Page Attribution
              </label>
              <input
                type="text"
                value={sourceAttr}
                onChange={(e) => setSourceAttr(e.target.value)}
                placeholder="@username or channel name"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="ai, startups, hyderabad, fashion"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Geographic Targeting */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-500" />
                <span>Geographic Target</span>
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllLocations}
                  onChange={(e) => setIsAllLocations(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>All Locations (India)</span>
              </label>
            </div>

            {!isAllLocations && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City (e.g. Hyderabad)"
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State (e.g. Telangana)"
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('DRAFT')}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Save Draft
            </button>

            {isAdmin ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('PUBLISHED')}
                className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Publish Directly'}
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('PENDING')}
                className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
