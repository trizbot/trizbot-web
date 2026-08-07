// p2p.model.ts

export enum P2POrderType {
  Buy = 'Buy',
  Sell = 'Sell',
}

export enum OrderStatus {
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum TradeStatus {
  PendingPayment = 'PendingPayment',
  Paid = 'Paid',
  Released = 'Released',
  Disputed = 'Disputed',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

export interface P2PMerchant {
  id: string;
  username: string;
  avatarUrl?: string | null;
  isVerified: boolean;
  totalTrades: number;
  completionRate: number;
}

export interface P2POrder {
  id: string;
  type: P2POrderType;
  coin: string;
  fiatCurrency: string;
  pricePerUnit: number;
  totalAmount: number;
  availableAmount: number;
  minLimit: number;
  maxLimit: number;
  paymentMethods: string[];
  terms?: string;
  paymentWindowMinutes?: number;
  status: OrderStatus;
  merchant: P2PMerchant;
  createdAt: string;
}

export interface P2PTrade {
  id: string;
  order: P2POrder;
  buyer: P2PMerchant;
  seller: P2PMerchant;
  isBuyer: boolean;
  coinAmount: number;
  fiatAmount: number;
  paymentMethod: string;
  status: TradeStatus;
  paymentDeadline?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Request bodies — kept in sync with the backend DTOs
// ---------------------------------------------------------------------

export interface CreateOrderReqBody {
  type: P2POrderType;
  coin: string;
  fiatCurrency: string;
  pricePerUnit: number;
  totalAmount: number;
  minLimit: number;
  maxLimit: number;
  paymentMethods: string[];
  terms?: string;
  paymentWindowMinutes?: number;
  /** Required by the backend when posting a Sell ad — locks coins in escrow. */
  transactionPin?: string;
}

export interface ListOrdersParams {
  type?: P2POrderType;
  coin?: string;
  fiatCurrency?: string;
}

export interface InitiateTradeReqBody {
  orderId: string;
  coinAmount: number;
  paymentMethod?: string;
  /** Required when the taker will be the seller in the resulting trade. */
  transactionPin?: string;
}

export const PAYMENT_METHODS: string[] = [
  'Bank Transfer',
  'Opay',
  'Solidpyco',
  'PalmPay',
  'Kuda',
  'Moniepoint',
];

export const PAYMENT_WINDOW_OPTIONS: number[] = [15, 30, 45, 60, 90, 120];

export const SUPPORTED_COINS: string[] = [
  'USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'TON', 'TRX', 'DOGE',
];
export const SUPPORTED_FIAT: string[] = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES'];



export function normalizeMerchant(raw: any, fallbackId?: string): P2PMerchant {
  if (raw && typeof raw === 'object') {
    return {
      id: raw.id || raw._id || fallbackId || '',
      username: raw.username || raw.name || placeholderName(fallbackId),
      avatarUrl: raw.avatarUrl ?? null,
      isVerified: !!raw.isVerified,
      totalTrades: raw.totalTrades ?? 0,
      completionRate: raw.completionRate ?? 0,
    };
  }
  return {
    id: fallbackId || '',
    username: placeholderName(fallbackId),
    avatarUrl: null,
    isVerified: false,
    totalTrades: 0,
    completionRate: 0,
  };
}

function placeholderName(id?: string): string {
  return id ? `Trader ${id.slice(-6).toUpperCase()}` : 'Merchant';
}

export function normalizeOrder(raw: any): P2POrder {
  return {
    id: raw.id || raw._id,
    type: raw.type,
    coin: raw.coin,
    fiatCurrency: raw.fiatCurrency,
    pricePerUnit: raw.pricePerUnit,
    totalAmount: raw.totalAmount,
    availableAmount: raw.availableAmount,
    minLimit: raw.minLimit,
    maxLimit: raw.maxLimit,
    paymentMethods: raw.paymentMethods || [],
    terms: raw.terms,
    paymentWindowMinutes: raw.paymentWindowMinutes,
    status: raw.status,
    merchant: normalizeMerchant(raw.merchant, raw.traderId),
    createdAt: raw.createdAt,
  };
}

export function normalizeTrade(raw: any): P2PTrade {
  return {
    id: raw.id || raw._id,
    order: normalizeOrder(raw.order || {}),
    buyer: normalizeMerchant(raw.buyer, raw.buyerId),
    seller: normalizeMerchant(raw.seller, raw.sellerId),
    isBuyer: !!raw.isBuyer,
    coinAmount: raw.coinAmount,
    fiatAmount: raw.fiatAmount,
    paymentMethod: raw.paymentMethod,
    status: raw.status,
    paymentDeadline: raw.paymentDeadline,
    createdAt: raw.createdAt,
  };
}