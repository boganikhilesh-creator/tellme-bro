import { z } from 'zod';
import { POST_PLATFORMS, POST_CONTENT_TYPES, POST_PRIORITIES, POST_STATUSES } from '@/lib/constants';

export const createPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters'),
  description: z.string().max(2000, 'Description must not exceed 2000 characters').optional().nullable(),
  originalUrl: z.string().url('Must be a valid social media URL'),
  platform: z.enum([
    POST_PLATFORMS.INSTAGRAM,
    POST_PLATFORMS.FACEBOOK,
    POST_PLATFORMS.YOUTUBE,
    POST_PLATFORMS.LINKEDIN,
  ]).optional(),
  contentType: z.enum([
    POST_CONTENT_TYPES.POST,
    POST_CONTENT_TYPES.REEL,
    POST_CONTENT_TYPES.VIDEO,
    POST_CONTENT_TYPES.SHORT,
    POST_CONTENT_TYPES.ARTICLE,
  ]).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  language: z.string().default('en'),
  priority: z.enum([
    POST_PRIORITIES.STANDARD,
    POST_PRIORITIES.PRIORITY,
    POST_PRIORITIES.ON_DEMAND,
  ]).default(POST_PRIORITIES.STANDARD),
  priorityStart: z.string().datetime().optional().nullable(),
  priorityEnd: z.string().datetime().optional().nullable(),
  publishAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  sourceAttr: z.string().max(100).optional().nullable(),
  copyrightInfo: z.string().max(200).optional().nullable(),
  categoryIds: z.array(z.string()).min(1, 'Please select at least one category'),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
  locations: z.array(z.object({
    locality: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    district: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().default('India'),
    postalCode: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    radiusKm: z.number().optional().nullable(),
    isAllLocations: z.boolean().default(false),
  })).optional().default([]),
  status: z.enum([
    POST_STATUSES.DRAFT,
    POST_STATUSES.PENDING,
    POST_STATUSES.PUBLISHED,
  ]).optional(),
});

export const updatePostSchema = createPostSchema.partial().extend({
  status: z.enum([
    POST_STATUSES.DRAFT,
    POST_STATUSES.PENDING,
    POST_STATUSES.APPROVED,
    POST_STATUSES.REJECTED,
    POST_STATUSES.SCHEDULED,
    POST_STATUSES.PUBLISHED,
    POST_STATUSES.ARCHIVED,
  ]).optional(),
});

export const postApprovalSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional(),
  publishAt: z.string().datetime().optional().nullable(),
  priority: z.enum([
    POST_PRIORITIES.STANDARD,
    POST_PRIORITIES.PRIORITY,
    POST_PRIORITIES.ON_DEMAND,
  ]).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostApprovalInput = z.infer<typeof postApprovalSchema>;
