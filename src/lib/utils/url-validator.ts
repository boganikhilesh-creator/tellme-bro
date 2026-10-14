import { PLATFORMS, CONTENT_TYPES } from '@/lib/constants';

export interface UrlDetectionResult {
  isValid: boolean;
  platform?: string;
  contentType?: string;
  embedUrl?: string | null;
  cleanUrl?: string;
  error?: string;
}

// Private IP and local address protection against SSRF
const PRIVATE_HOSTS_REGEX = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|::1)$/i;

export async function validateAndDetectSocialUrl(inputUrl: string): Promise<UrlDetectionResult> {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false, error: 'URL must be a non-empty string' };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return { isValid: false, error: 'Malformed URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
  }

  // SSRF check
  const hostname = parsed.hostname.toLowerCase();
  if (PRIVATE_HOSTS_REGEX.test(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { isValid: false, error: 'Access to private internal hostnames is prohibited' };
  }

  const pathname = parsed.pathname;

  // 1. YouTube Detection
  if (hostname.includes('youtube.com') || hostname === 'youtu.be') {
    let videoId: string | null = null;
    let contentType = CONTENT_TYPES.VIDEO;

    if (hostname === 'youtu.be') {
      videoId = pathname.slice(1).split('/')[0];
    } else if (pathname.startsWith('/shorts/')) {
      videoId = pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
      contentType = CONTENT_TYPES.SHORT;
    } else if (pathname.startsWith('/embed/')) {
      videoId = pathname.split('/embed/')[1]?.split('/')[0]?.split('?')[0];
    } else {
      videoId = parsed.searchParams.get('v');
    }

    if (!videoId) {
      return { isValid: false, error: 'Could not extract YouTube video or short ID' };
    }

    return {
      isValid: true,
      platform: PLATFORMS.YOUTUBE,
      contentType,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  // 2. Instagram Detection
  if (hostname.includes('instagram.com')) {
    let contentType = CONTENT_TYPES.POST;
    let shortcode: string | null = null;

    if (pathname.includes('/reel/') || pathname.includes('/reels/')) {
      contentType = CONTENT_TYPES.REEL;
      shortcode = pathname.split(/\/reels?\/([a-zA-Z0-9_-]+)/)[1];
    } else if (pathname.includes('/p/')) {
      contentType = CONTENT_TYPES.POST;
      shortcode = pathname.split(/\/p\/([a-zA-Z0-9_-]+)/)[1];
    }

    const cleanUrl = shortcode
      ? `https://www.instagram.com/${contentType === CONTENT_TYPES.REEL ? 'reel' : 'p'}/${shortcode}/`
      : inputUrl;

    const embedUrl = shortcode
      ? `https://www.instagram.com/${contentType === CONTENT_TYPES.REEL ? 'reel' : 'p'}/${shortcode}/embed`
      : null;

    return {
      isValid: true,
      platform: PLATFORMS.INSTAGRAM,
      contentType,
      embedUrl,
      cleanUrl,
    };
  }

  // 3. Facebook Detection
  if (hostname.includes('facebook.com') || hostname === 'fb.watch') {
    let contentType = CONTENT_TYPES.POST;
    if (pathname.includes('/reel/') || pathname.includes('/reels/')) {
      contentType = CONTENT_TYPES.REEL;
    } else if (pathname.includes('/videos/') || pathname.includes('/watch') || hostname === 'fb.watch') {
      contentType = CONTENT_TYPES.VIDEO;
    }

    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(inputUrl)}&show_text=false`;

    return {
      isValid: true,
      platform: PLATFORMS.FACEBOOK,
      contentType,
      embedUrl,
      cleanUrl: inputUrl,
    };
  }

  // 4. LinkedIn Detection
  if (hostname.includes('linkedin.com')) {
    let contentType = CONTENT_TYPES.POST;
    if (pathname.includes('/pulse/')) {
      contentType = CONTENT_TYPES.ARTICLE;
    } else if (pathname.includes('/videos/') || pathname.includes('/video/')) {
      contentType = CONTENT_TYPES.VIDEO;
    }

    return {
      isValid: true,
      platform: PLATFORMS.LINKEDIN,
      contentType,
      embedUrl: null, // LinkedIn handles embeds via official oEmbed or fallback card
      cleanUrl: inputUrl,
    };
  }

  return {
    isValid: false,
    error: 'Unsupported platform. Supported platforms: Instagram, YouTube, Facebook, LinkedIn.',
  };
}
