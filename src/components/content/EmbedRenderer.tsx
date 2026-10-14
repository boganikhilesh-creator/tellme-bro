'use client';

import React, { useState } from 'react';
import { ExternalLink, Play, AlertCircle } from 'lucide-react';
import { SocialIcon } from '@/components/ui/social-icons';

interface EmbedRendererProps {
  platform: string;
  contentType: string;
  originalUrl: string;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  title: string;
}

export function EmbedRenderer({
  platform,
  contentType,
  originalUrl,
  embedUrl,
  thumbnailUrl,
  title,
}: EmbedRendererProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const isVertical = contentType === 'REEL' || contentType === 'SHORT';

  // 1. YouTube Video / Short
  if (platform === 'YOUTUBE' && embedUrl) {
    if (!isPlaying && thumbnailUrl) {
      return (
        <div
          onClick={() => setIsPlaying(true)}
          className={`relative group cursor-pointer overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 dark:border-slate-800 ${
            isVertical ? 'aspect-[9/16] max-h-[520px] mx-auto' : 'aspect-video w-full'
          }`}
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/20 transition flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition">
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded-md text-[10px] text-white font-semibold">
            {contentType === 'SHORT' ? 'YouTube Short' : 'Watch Video'}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 dark:border-slate-800 ${
          isVertical ? 'aspect-[9/16] max-h-[520px] mx-auto' : 'aspect-video w-full'
        }`}
      >
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  // 2. Instagram Embed / Reel / Post
  if (platform === 'INSTAGRAM') {
    if (embedUrl && !loadError) {
      return (
        <div
          className={`overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 dark:border-slate-800 ${
            isVertical ? 'aspect-[9/16] max-h-[520px] mx-auto' : 'aspect-[4/5] max-h-[500px] w-full'
          }`}
        >
          <iframe
            src={embedUrl}
            title={title}
            onError={() => setLoadError(true)}
            className="w-full h-full border-0"
            allowTransparency
          />
        </div>
      );
    }
  }

  // 3. Facebook Embed / Reel / Video
  if (platform === 'FACEBOOK') {
    if (embedUrl && !loadError) {
      return (
        <div
          className={`overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 dark:border-slate-800 ${
            isVertical ? 'aspect-[9/16] max-h-[520px] mx-auto' : 'aspect-video w-full'
          }`}
        >
          <iframe
            src={embedUrl}
            title={title}
            onError={() => setLoadError(true)}
            className="w-full h-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }
  }

  // 4. LinkedIn Embed
  if (platform === 'LINKEDIN') {
    if (embedUrl && !loadError) {
      return (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 aspect-[4/3] w-full">
          <iframe
            src={embedUrl}
            title={title}
            onError={() => setLoadError(true)}
            className="w-full h-full border-0"
          />
        </div>
      );
    }
  }

  // Fallback Rich Preview Card with Platform Icon & Original Link
  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/80 dark:to-slate-900 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center mb-3">
        <SocialIcon platform={platform} className="w-7 h-7" />
      </div>

      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mb-1">
        {title}
      </h4>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 capitalize">
        {platform.toLowerCase()} • {contentType.toLowerCase()}
      </p>

      <a
        href={originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
      >
        <span>View on {platform}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
