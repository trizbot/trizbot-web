export enum FeedCategoryEnum {
  News = 'news',
  Announcement = 'announcement',
  MarketAnalysis = 'market_analysis',
  PriceAlert = 'price_alert',
  Regulation = 'regulation',
  Partnership = 'partnership',
}

export interface FeedItem {
  id: string;
  title: string;
  summary?: string;
  content: string;
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  category?: FeedCategoryEnum;
  coinSymbol?: string;
  tags?: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedListResponse {
  items: FeedItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetFeedParams {
  category?: FeedCategoryEnum | '';
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

export const FEED_CATEGORY_LABELS: Record<FeedCategoryEnum, string> = {
  [FeedCategoryEnum.News]: 'News',
  [FeedCategoryEnum.Announcement]: 'Announcement',
  [FeedCategoryEnum.MarketAnalysis]: 'Market Analysis',
  [FeedCategoryEnum.PriceAlert]: 'Price Alert',
  [FeedCategoryEnum.Regulation]: 'Regulation',
  [FeedCategoryEnum.Partnership]: 'Partnership',
};

export const FEED_CATEGORY_COLORS: Record<FeedCategoryEnum, string> = {
  [FeedCategoryEnum.News]: '#3f51b5',
  [FeedCategoryEnum.Announcement]: '#f5a623',
  [FeedCategoryEnum.MarketAnalysis]: '#6c63ff',
  [FeedCategoryEnum.PriceAlert]: '#e53935',
  [FeedCategoryEnum.Regulation]: '#00897b',
  [FeedCategoryEnum.Partnership]: '#8e24aa',
};