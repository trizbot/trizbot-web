
export type ArbitrageSubscriptionPlan = 'weekly' | 'monthly';

export interface ArbitrageSubscriptionPlanDetails {
  label: string;
  price: number;
  durationDays: number;
}

export const ARBITRAGE_SUBSCRIPTION_PLANS: Record<ArbitrageSubscriptionPlan, ArbitrageSubscriptionPlanDetails> = {
  weekly:  { label: 'Weekly',  price: 50,  durationDays: 7 },
  monthly: { label: 'Monthly', price: 150, durationDays: 30 },
};

export interface MyArbitrageSubscription {
  _id: string;
  traderId: string;
  plan: ArbitrageSubscriptionPlan;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export enum ArbitrageSubscriptionPeriodStatus {
  Active = 'active',
  Expired = 'expired',
}


export function getArbitrageSubscriptionPeriodStatus(
  sub: MyArbitrageSubscription,
): ArbitrageSubscriptionPeriodStatus {
  const statusSaysActive = sub.status === 'active';
  const notPastEndDate = new Date(sub.endDate).getTime() > Date.now();

  return statusSaysActive && notPastEndDate
    ? ArbitrageSubscriptionPeriodStatus.Active
    : ArbitrageSubscriptionPeriodStatus.Expired;
}