import { NextRequest } from 'next/server';
import { validateAndDetectSocialUrl } from '@/lib/utils/url-validator';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
      return errorResponse('URL query parameter is required', 400);
    }

    const detection = await validateAndDetectSocialUrl(url);
    if (!detection.isValid) {
      return errorResponse(detection.error || 'Invalid or unsupported social media URL', 400);
    }

    return successResponse({
      platform: detection.platform,
      contentType: detection.contentType,
      embedUrl: detection.embedUrl,
    });
  } catch (error: any) {
    console.error('URL detection error:', error);
    return errorResponse(error.message || 'Failed to detect URL metadata', 500);
  }
}
