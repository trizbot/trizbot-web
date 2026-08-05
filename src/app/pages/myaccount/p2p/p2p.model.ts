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

// Fallback suggestion lists — the P2P page passes its own (larger) lists
// into the create-order dialog; these only apply if it's ever opened
// without that dialog data.
export const SUPPORTED_COINS: string[] = [
  'USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'TON', 'TRX', 'DOGE',
];
export const SUPPORTED_FIAT: string[] = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES'];