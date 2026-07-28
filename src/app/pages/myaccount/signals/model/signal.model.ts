export enum SignalTypeEnum {
  Buy = 'Buy',
  Sell = 'Sell',
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
};

export const SIGNAL_TYPE_COLORS: Record<SignalTypeEnum, string> = {
  [SignalTypeEnum.Buy]: '#2e7d32',
  [SignalTypeEnum.Sell]: '#e53935',
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

/** Generic PAGINATED envelope, as actually returned by GET /signals:
 *  { message, data: RawSignal[], meta: { total, page, limit, totalPages } }
 */
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
  type: SignalTypeEnum | string;
  entryPrice: number;
  targetPrice?: number;
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
  type: SignalTypeEnum;
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  analysis?: string;
  postedByName?: string;
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
  type: SignalTypeEnum;
  entryPrice: number;
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

/** Normalizes a raw API signal (_id, string type) into the shape the UI uses (id, enum type) */
export function normalizeSignal(raw: RawSignal): SignalItem {
  return {
    id: raw._id,
    pair: raw.pair,
    type: raw.type as SignalTypeEnum,
    entryPrice: raw.entryPrice,
    targetPrice: raw.targetPrice,
    stopLoss: raw.stopLoss,
    analysis: raw.analysis,
    postedByName: raw.postedByName,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}