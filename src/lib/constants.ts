// Allowed email domains for email/password registration (per spec Section 3)
export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'ymail.com',
  'yahoo.com',
  'yahoo.in',
  'yahoo.co.in',
  'yahoomail.com',
  'rediff.com',
  'rediffmail.com',
  'outlook.com',
  'live.com',
] as const;

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  USER: 'USER',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

export const POST_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export const POST_STATUSES = POST_STATUS;

export const PLATFORMS = {
  INSTAGRAM: 'INSTAGRAM',
  FACEBOOK: 'FACEBOOK',
  YOUTUBE: 'YOUTUBE',
  LINKEDIN: 'LINKEDIN',
} as const;

export const POST_PLATFORMS = PLATFORMS;

export const CONTENT_TYPES = {
  POST: 'POST',
  REEL: 'REEL',
  VIDEO: 'VIDEO',
  SHORT: 'SHORT',
  ARTICLE: 'ARTICLE',
} as const;

export const POST_CONTENT_TYPES = CONTENT_TYPES;

export const PRIORITIES = {
  STANDARD: 'STANDARD',
  PRIORITY: 'PRIORITY',
  ON_DEMAND: 'ON_DEMAND',
} as const;

export const POST_PRIORITIES = PRIORITIES;

export const DEFAULT_CATEGORIES = [
  {
    name: 'Education',
    slug: 'education',
    description: 'Academic insights, career guidance, tutorials, and educational reels',
    displayOrder: 1,
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Trending styles, apparel, cosmetics, local boutiques, and lifestyle',
    displayOrder: 2,
  },
  {
    name: 'Medical',
    slug: 'medical',
    description: 'Health awareness, local healthcare, doctor advice, and wellness tips',
    displayOrder: 3,
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Local businesses, startups, entrepreneurship, and marketplace news',
    displayOrder: 4,
  },
  {
    name: 'Others',
    slug: 'others',
    description: 'Community events, general interest, announcements, and miscellaneous',
    displayOrder: 5,
  },
];
