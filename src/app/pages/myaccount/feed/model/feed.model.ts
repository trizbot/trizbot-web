export enum FeedCategoryEnum {
  News = 'news',
  Announcement = 'announcement',
  MarketAnalysis = 'market_analysis',
  PriceAlert = 'price_alert',
  Regulation = 'regulation',
  Partnership = 'partnership',
  Trend = 'Trend', // matches raw "category": "Trend" coming back from CoinGecko sync
}

/** Shape actually returned by the backend for a single item */
export interface RawFeedItem {
  _id: string;
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
  summary?: string;
  content: string;
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  category?: FeedCategoryEnum;
  coinSymbol?: string;
  tags?: string[];
  isPublished?: boolean;
}

export type UpdateFeedPayload = Partial<CreateFeedPayload>;

export const FEED_CATEGORY_OPTIONS: FeedCategoryEnum[] = Object.values(FeedCategoryEnum);

export const FEED_CATEGORY_LABELS: Record<string, string> = {
  [FeedCategoryEnum.News]: 'News',
  [FeedCategoryEnum.Announcement]: 'Announcement',
  [FeedCategoryEnum.MarketAnalysis]: 'Market Analysis',
  [FeedCategoryEnum.PriceAlert]: 'Price Alert',
  [FeedCategoryEnum.Regulation]: 'Regulation',
  [FeedCategoryEnum.Partnership]: 'Partnership',
  [FeedCategoryEnum.Trend]: 'Trending',
};

export const FEED_CATEGORY_COLORS: Record<string, string> = {
  [FeedCategoryEnum.News]: '#3f51b5',
  [FeedCategoryEnum.Announcement]: '#f5a623',
  [FeedCategoryEnum.MarketAnalysis]: '#6c63ff',
  [FeedCategoryEnum.PriceAlert]: '#e53935',
  [FeedCategoryEnum.Regulation]: '#00897b',
  [FeedCategoryEnum.Partnership]: '#8e24aa',
  [FeedCategoryEnum.Trend]: '#f5a623',
};


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