export enum SignalTypeEnum {
  Buy = 'Buy',
  Sell = 'Sell',
  Long = 'Long',
  Short = 'Short',
  Hedge = 'Hedge',
}

export enum SignalCategoryEnum {
  Futures = 'Futures',
  Spot = 'Spot',
}

export const SIGNAL_TYPE_LABELS: Record<SignalTypeEnum, string> = {
  [SignalTypeEnum.Buy]: 'Buy',
  [SignalTypeEnum.Sell]: 'Sell',
  [SignalTypeEnum.Long]: 'Long',
  [SignalTypeEnum.Short]: 'Short',
  [SignalTypeEnum.Hedge]: 'Hedge',
};

export const SIGNAL_TYPE_COLORS: Record<SignalTypeEnum, string> = {
  [SignalTypeEnum.Buy]: '#2e7d32',
  [SignalTypeEnum.Sell]: '#e53935',
  [SignalTypeEnum.Short]: '#f44336',
  [SignalTypeEnum.Long]: '#4caf50',
  [SignalTypeEnum.Hedge]: '#ff9800',
};

export const SIGNAL_CATEGORY_LABELS: Record<SignalCategoryEnum, string> = {
  [SignalCategoryEnum.Futures]: 'Futures',
  [SignalCategoryEnum.Spot]: 'Spot',
};

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface ApiListResponse<T> {
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RawSignal {
  _id: string;
  pair: string;
  type?: SignalTypeEnum | string;
  category: SignalCategoryEnum | string;
  entryPrice: number;
  targetPrice?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  stopLoss?: number;
  analysis?: string;
  postedBy?: string;
  postedByName?: string;
  riskRewardRatio?: string;
  isActive: boolean;
  postedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SignalItem {
  id: string;
  pair: string;
  type?: SignalTypeEnum;
  category: SignalCategoryEnum;
  entryPrice: number;
  targetPrice?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  stopLoss?: number;
  analysis?: string;
  postedByName?: string;
  riskRewardRatio?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SignalListResponse {
  items: SignalItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetSignalsParams {
  pair?: string;
  page?: number;
  limit?: number;
}

export interface CreateSignalPayload {
  pair: string;
  category: SignalCategoryEnum;
  type?: SignalTypeEnum;
  entryPrice: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  targetPrice?: number;
  stopLoss?: number;
  analysis?: string;
  riskRewardRatio?: string;
  isActive?: boolean;
}

export type UpdateSignalPayload = Partial<CreateSignalPayload>;

export function normalizeSignal(raw: RawSignal): SignalItem {
  return {
    id: raw._id,
    pair: raw.pair,
    type: raw.type as SignalTypeEnum | undefined,
    category: raw.category as SignalCategoryEnum,
    entryPrice: raw.entryPrice,
    targetPrice: raw.targetPrice,
    takeProfit1: raw.takeProfit1,
    takeProfit2: raw.takeProfit2,
    takeProfit3: raw.takeProfit3,
    stopLoss: raw.stopLoss,
    analysis: raw.analysis,
    postedByName: raw.postedByName,
    riskRewardRatio: raw.riskRewardRatio,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}