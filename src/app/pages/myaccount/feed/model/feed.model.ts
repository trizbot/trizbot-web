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
  category?: FeedCategoryEnum | string;
  coinSymbol?: string;
  tags?: string[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RawFeedCategory {
  _id: string;
  reference?: string;
  title: string;
  summary?: string;
  source?: string;
  category?: string;
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

/** Normalized shape the UI actually works with */
export interface FeedItem {
  id: string;
  reference?: string;
  title: string;
  summary?: string;
  content: string;
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  category?: FeedCategoryEnum | string;
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
  category?: FeedCategoryEnum | string | '';
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
  category?: FeedCategoryEnum | null;
  coinSymbol?: string | null;
  tags?: string[];
  isPublished?: boolean;
  // `reference` is intentionally NOT part of this payload — it is always
  // generated server-side on create and must never be sent by the client.
}

export type UpdateFeedPayload = Partial<CreateFeedPayload>;

export const FEED_CATEGORY_OPTIONS: FeedCategoryEnum[] = Object.values(FeedCategoryEnum);

export const FEED_CATEGORY_LABELS: Record<string, string> = {
  [FeedCategoryEnum.News]: 'News',
  [FeedCategoryEnum.Announcement]: 'Announcement',
  [FeedCategoryEnum.MarketAnalysis]: 'Market Analysis',
  [FeedCategoryEnum.PriceAlert]: 'Price Alert',
  [FeedCategoryEnum.PriceUpdate]: 'Price Update',
  [FeedCategoryEnum.Regulation]: 'Regulation',
  [FeedCategoryEnum.Partnership]: 'Partnership',
  [FeedCategoryEnum.Trend]: 'Trending',
};

export const FEED_CATEGORY_COLORS: Record<string, string> = {
  [FeedCategoryEnum.News]: '#5B8DEF',
  [FeedCategoryEnum.Announcement]: '#F5A623',
  [FeedCategoryEnum.MarketAnalysis]: '#8E7CFF',
  [FeedCategoryEnum.PriceAlert]: '#EA3943',
  [FeedCategoryEnum.PriceUpdate]: '#EA3943',
  [FeedCategoryEnum.Regulation]: '#16C784',
  [FeedCategoryEnum.Partnership]: '#EF7BD8',
  [FeedCategoryEnum.Trend]: '#F5A623',
};


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

  export function mapRawFeedCategory(raw: RawFeedCategory) {
  return {
    id: raw._id,
    reference: raw.reference,
    title: raw.title,
    summary: raw.summary,
    source: raw.source,
    category: raw.category,
    isPublished: raw.isPublished,
    createdAt: raw.createdAt,
    publishedAt: raw.publishedAt,
    updatedAt: raw.updatedAt,
    stats: parseStats(raw.summary),
  };
  
}