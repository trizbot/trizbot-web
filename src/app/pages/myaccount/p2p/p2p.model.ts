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
}

export interface ListOrdersParams {
  type?: P2POrderType;
  coin?: string;
  fiatCurrency?: string;
  paymentMethod?: string;
}

export interface InitiateTradeReqBody {
  orderId: string;
  coinAmount: number;
  paymentMethod: string;
  transactionPin?: string;
}

export const PAYMENT_METHODS: string[] = [
  'Bank Transfer',
  'Opay',
  'PalmPay',
  'Kuda',
  'Moniepoint',
  'Solidpyco',
];

export const SUPPORTED_COINS: string[] = ['USDT', 'USDC', 'BTC', 'ETH'];

export const SUPPORTED_FIAT: string[] = ['NGN', 'GHS', 'KES'];