export enum FeedCategoryEnum {
  News = 'News',
  Announcement = 'Announcement',
  MarketAnalysis = 'MarketAnalysis',
  PriceAlert = 'PriceAlert',
  PriceUpdate = 'PriceUpdate',
  Regulation = 'Regulation',
  Partnership = 'Partnership',
  Trend = 'Trend',
}

/** Shape actually returned by the backend for a single item */
export interface RawFeedItem {
  _id: string;
  reference?: string;
  title: string;
  summary?: string;
  content: string;
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  category?: string;
  coinSymbol?: string;
  tags?: string[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Shape actually returned by the backend for a list endpoint */
export interface RawFeedListResponse {
  message: string;
  data: RawFeedItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Derived display stats parsed out of the summary/content text */
export interface FeedItemStats {
  rank?: string;
  price?: string;
  changePercent?: number;
}

export interface FeedItem {
  id: string;
  reference?: string;
  title: string;
  summary?: string;
  content: string;
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  category?: string;
  coinSymbol?: string;
  tags?: string[];
  isPublished: boolean;
  createdAt: string;
  publishedAt?: string;
  updatedAt?: string;
  stats?: FeedItemStats;
}

export interface FeedListResponse {
  items: FeedItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetFeedParams {
  category?: string;
  coinSymbol?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateFeedPayload {
  title: string;
  summary?: string | null;
  content: string;
  source?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;

  category?: string | null;
  coinSymbol?: string | null;
  tags?: string[];
  isPublished?: boolean;
  
}

export type UpdateFeedPayload = Partial<CreateFeedPayload>;

export function generateClientReferenceHint(prefix = 'FD'): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${year}-${rand}`;
}

function parseStats(text?: string): FeedItemStats {
  if (!text) return {};

  const rankMatch = text.match(/[Rr]ank[:\s#]*#?(\d+)/);
  const priceMatch = text.match(/\$([\d,]+(?:\.\d+)?)/);
  const changeMatch = text.match(/(-?\d+(?:\.\d+)?)\s*%\s*\(24h\)/i);

  return {
    rank: rankMatch ? rankMatch[1] : undefined,
    price: priceMatch ? priceMatch[1] : undefined,
    changePercent: changeMatch ? parseFloat(changeMatch[1]) : undefined,
  };
}

export function mapRawFeedItem(raw: RawFeedItem): FeedItem {
  return {
    id: raw._id,
    reference: raw.reference,
    title: raw.title,
    summary: raw.summary,
    content: raw.content,
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    imageUrl: raw.imageUrl,
    category: raw.category,
    coinSymbol: raw.coinSymbol,
    tags: raw.tags,
    isPublished: raw.isPublished,
    createdAt: raw.createdAt,
    publishedAt: raw.publishedAt,
    updatedAt: raw.updatedAt,
    stats: parseStats(raw.summary || raw.content),
  };
}


export interface RawFeedCategoryDoc {
  _id: string;
  category: string;
  reference?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Normalized shape the UI works with */
export interface FeedCategoryItem {
  id: string;
  category: string;
  reference?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFeedCategoryPayload {
  category: string;
}

export type UpdateFeedCategoryPayload = Partial<CreateFeedCategoryPayload>;

export function normalizeFeedCategory(raw: RawFeedCategoryDoc): FeedCategoryItem {
  return {
    id: raw._id,
    category: raw.category,
    reference: raw.reference,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}


export interface FeedShareLinks {
  linkedin: string;
  twitter: string;
  whatsapp: string;
  facebook: string;
  email: string;
}

export function buildFeedShareText(title: string, category?: string): string {
  const categoryTag = category ? ` #${category.replace(/\s+/g, '')}` : '';
  return `${title}${categoryTag} — via Trizbot Feed`;
}

export function buildFeedShareLinks(url: string, text: string): FeedShareLinks {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodedText}%20${encodedUrl}`,
  };
}