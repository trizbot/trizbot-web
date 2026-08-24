export type ArbitrageSubscriptionPlan = 'weekly' | 'monthly';

export interface ArbitrageSubscriptionPlanInfo {
  label: string;
  price: number; // USDT
  durationDays: number;
}

export const ARBITRAGE_SUBSCRIPTION_PLANS: Record<ArbitrageSubscriptionPlan, ArbitrageSubscriptionPlanInfo> = {
  weekly: { label: 'Weekly', price: 50, durationDays: 7 },
  monthly: { label: 'Monthly', price: 120, durationDays: 30 },
};

export enum ArbitrageSubscriptionPeriodStatus {
  Active = 'Active',
  Pending = 'Pending',
  Expired = 'Expired',
}

export interface MyArbitrageSubscription {
  _id: string;
  traderId: string;
  plan: ArbitrageSubscriptionPlan;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
}

export function getArbitrageSubscriptionPeriodStatus(
  sub: MyArbitrageSubscription | null | undefined
): ArbitrageSubscriptionPeriodStatus {
  if (!sub) return ArbitrageSubscriptionPeriodStatus.Expired;
  const now = Date.now();
  const end = new Date(sub.endDate).getTime();

  if (sub.status === 'pending') return ArbitrageSubscriptionPeriodStatus.Pending;
  if (sub.status === 'active' && end > now) return ArbitrageSubscriptionPeriodStatus.Active;
  return ArbitrageSubscriptionPeriodStatus.Expired;
}