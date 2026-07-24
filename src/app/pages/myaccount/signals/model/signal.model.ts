export enum SignalTypeEnum {
  Buy = 'buy',
  Sell = 'sell',
}

export enum SubscriptionPlanEnum {
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  Yearly = 'yearly',
}

export enum SubscriptionStatusEnum {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
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
  [SubscriptionPlanEnum.Weekly]: 'Weekly',
  [SubscriptionPlanEnum.Monthly]: 'Monthly',
  [SubscriptionPlanEnum.Quarterly]: 'Quarterly',
  [SubscriptionPlanEnum.Yearly]: 'Yearly',
};

export interface SignalItem {
  id: string;
  pair: string;
  type: SignalTypeEnum;
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  analysis?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SignalListResponse {
  items: SignalItem[];
  total: number;
  page: number;
  limit: number;
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
}

export type UpdateSignalPayload = Partial<CreateSignalPayload>;

export interface PlanOption {
  plan: SubscriptionPlanEnum;
  durationDays: number;
  price: number;
}

export interface SubscribePayload {
  plan: SubscriptionPlanEnum;
  transactionPin: string;
  reference: string;
}

export interface MySubscription {
  id: string;
  plan: SubscriptionPlanEnum;
  status: SubscriptionStatusEnum;
  startDate: string;
  endDate: string;
}