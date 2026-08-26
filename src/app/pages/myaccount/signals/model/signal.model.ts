export enum SignalTypeEnum {
  Buy = 'Buy',
  Sell = 'Sell',
   Long = 'Long',
   Short = 'Short',
  Hedge = 'Hedge',
 
}

/** New: replaces "type" (Buy/Sell) as the primary classification on the create/edit form */
export enum SignalCategoryEnum {
  Futures = 'Futures',
  Spot = 'Spot',
}

export enum SubscriptionPlanEnum {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
}

/** Matches the real `status` values returned by the payment/subscription API */
export enum SubscriptionStatusEnum {
  Completed = 'Completed',
  Pending = 'Pending',
  Failed = 'Failed',
}

/** Derived (not from API) — whether a subscription's date window is in effect right now */
export enum SubscriptionPeriodStatus {
  Upcoming = 'upcoming',
  Active = 'active',
  Expired = 'expired',
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

export const PLAN_LABELS: Record<SubscriptionPlanEnum, string> = {
  [SubscriptionPlanEnum.Daily]: 'Daily',
  [SubscriptionPlanEnum.Weekly]: 'Weekly',
  [SubscriptionPlanEnum.Monthly]: 'Monthly',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatusEnum, string> = {
  [SubscriptionStatusEnum.Completed]: 'Completed',
  [SubscriptionStatusEnum.Pending]: 'Pending',
  [SubscriptionStatusEnum.Failed]: 'Failed',
};

export const SUBSCRIPTION_PERIOD_LABELS: Record<SubscriptionPeriodStatus, string> = {
  [SubscriptionPeriodStatus.Upcoming]: 'Upcoming',
  [SubscriptionPeriodStatus.Active]: 'Active now',
  [SubscriptionPeriodStatus.Expired]: 'Expired',
};

/** Generic API envelope: backend wraps every payload as { message, data } */
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

/** Raw shape exactly as returned by the API (before normalization) */
export interface RawSignal {
  _id: string;
  pair: string;
  /** @deprecated kept for backward compatibility with older records / other UI that still reads Buy/Sell */
  type?: SignalTypeEnum | string;
  category: SignalCategoryEnum | string;
  entryPrice: number;
  /** @deprecated use takeProfit1/2/3 instead */
  targetPrice?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  stopLoss?: number;
  analysis?: string;
  postedBy?: string;
  postedByName?: string;
  isActive: boolean;
  postedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SignalItem {
  id: string;
  pair: string;
  /** @deprecated kept for backward compatibility with older records / other UI that still reads Buy/Sell */
  type?: SignalTypeEnum;
  category: SignalCategoryEnum;
  entryPrice: number;
  /** @deprecated use takeProfit1/2/3 instead */
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
  bypassSubscription?: boolean;
}

export interface CreateSignalPayload {
  pair: string;
  category: SignalCategoryEnum;
  /** @deprecated no longer collected on the form; kept optional for backward compatibility */
  type?: SignalTypeEnum;
  entryPrice: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  /** @deprecated use takeProfit1/2/3 instead */
  targetPrice?: number;
  stopLoss?: number;
  analysis?: string;
  isActive?: boolean;
}

export type UpdateSignalPayload = Partial<CreateSignalPayload>;

export interface PlanOption {
  plan: SubscriptionPlanEnum;
  durationDays: number;
  amount: number;
  currency: string;
}

export interface SubscribePayload {
  plan: SubscriptionPlanEnum;
  amount?: number;
  transactionPin: string;
  reference: string;
}

/** Shape of a single subscription record, as actually returned by the API */
export interface MySubscription {
  _id: string;
  entityId: string;
  plan: SubscriptionPlanEnum;
  amount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  reference: string;
  status: SubscriptionStatusEnum;
  createdAt: string;
  updatedAt: string;
}

export function getSubscriptionPeriodStatus(sub: MySubscription): SubscriptionPeriodStatus {
  const now = Date.now();
  const starts = new Date(sub.startsAt).getTime();
  const expires = new Date(sub.expiresAt).getTime();

  if (now < starts) return SubscriptionPeriodStatus.Upcoming;
  if (now >= expires) return SubscriptionPeriodStatus.Expired;
  return SubscriptionPeriodStatus.Active;
}

/** Normalizes a raw API signal (_id, string type/category) into the shape the UI uses (id, enums) */
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
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}