
import { UserPaymentMethod, normalizePaymentMethod } from "../payment-method/payment-method.model";

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
  Pending = 'Pending',
  Paid = 'Paid',
  Completed = 'Completed',
  Disputed = 'Disputed',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

export interface P2PMerchant {
  id: string;
  username: string;
  avatarUrl?: string | null;
  isVerified: boolean;
  isPremium?: boolean;
  totalTrades: number;
  completionRate: number;
  avgReleaseMinutes?: number;
}

export interface UpdateOrderReqBody {
  pricePerUnit?: number;
  totalAmount?: number;
  minLimit?: number;
  maxLimit?: number;
  paymentMethods?: string[];
  /** References into the trader's saved payment methods — no raw account
   *  details are ever sent per-ad any more. */
  paymentMethodIds?: string[];
  terms?: string;
  paymentWindowMinutes?: number;
  transactionPin?: string;
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
  /** IDs the ad points to. */
  paymentMethodIds?: string[];

  paymentMethodDetails?: UserPaymentMethod[];
  terms?: string;
  paymentWindowMinutes?: number;
  status: OrderStatus;
  isListed?: boolean;
  feePercent?: number;
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
  /** The one saved payment method actually locked in for this trade
   *  (the seller's receiving account, whichever side supplied it). */
  sellerPaymentMethod?: UserPaymentMethod;
  status: TradeStatus;
  paymentDeadline?: string;
  createdAt: string;
  paymentProofUrl?: string;
  paymentProofNote?: string;
  paidAt?: string;
  releasedAt?: string;
  autoReleaseEligible?: boolean;
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
  paymentMethodIds?: string[];
  terms?: string;
  paymentWindowMinutes?: number;
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
  transactionPin?: string;
  /** When I'm the one selling (i.e. the ad was a Buy ad), this is the ID
   *  of MY saved payment method the buyer should pay into. */
  paymentMethodId?: string;
}

export const PAYMENT_WINDOW_OPTIONS: number[] = [15, 30, 45];

// SUPPORTED_COINS is now a fallback only — the live list comes from
// P2pCategoryService.getCategorySymbols(), managed by admins.
export const SUPPORTED_COINS: string[] = ['USDT', 'BTC'];
export const QUICK_COINS: string[] = ['USDT', 'BTC'];

export const SUPPORTED_FIAT: string[] = [
  'NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR', 'INR', 'CNY', 'AED',
  'CAD', 'AUD', 'JPY', 'BRL', 'TRY', 'PKR', 'EGP', 'UGX', 'TZS', 'XOF',
];

export const PAYMENT_METHODS_BY_FIAT: Record<string, string[]> = {
  NGN: ['Solidpyco', 'Bank Transfer', 'Opay', 'PalmPay', 'Kuda', 'Moniepoint'],
  USD: ['Solidpyco', 'Zelle', 'Wise', 'PayPal', 'ACH Bank Transfer', 'Cash App', 'Venmo'],
  EUR: ['Solidpyco', 'SEPA Transfer', 'Wise', 'Revolut', 'N26'],
  GBP: ['Solidpyco', 'Faster Payments', 'Wise', 'Revolut', 'UK Bank Transfer'],
  GHS: ['Solidpyco', 'MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo Money', 'Bank Transfer'],
  KES: ['Solidpyco', 'M-Pesa', 'Bank Transfer', 'Airtel Money'],
  ZAR: ['Bank Transfer (EFT)', 'Capitec Pay', 'FNB eWallet'],
  INR: ['UPI', 'IMPS', 'Paytm', 'Bank Transfer'],
  CNY: ['Alipay', 'WeChat Pay', 'Bank Transfer'],
  AED: ['Bank Transfer', 'Wise'],
  CAD: ['Interac e-Transfer', 'Wise'],
  AUD: ['PayID', 'Bank Transfer', 'Wise'],
  JPY: ['Bank Transfer', 'PayPay'],
  BRL: ['Pix', 'Bank Transfer'],
  TRY: ['Papara', 'Bank Transfer', 'Wise'],
  PKR: ['Easypaisa', 'JazzCash', 'Bank Transfer'],
  EGP: ['Solidpyco', 'Vodafone Cash', 'InstaPay', 'Bank Transfer'],
  UGX: ['Solidpyco', 'MTN Mobile Money', 'Airtel Money'],
  TZS: ['Solidpyco', 'M-Pesa', 'Tigo Pesa', 'Airtel Money'],
  XOF: ['Solidpyco', 'Orange Money', 'Wave', 'MTN Mobile Money'],
};

export const PAYMENT_METHODS: string[] = PAYMENT_METHODS_BY_FIAT['NGN'];

export function getPaymentMethodsForFiat(fiat: string | null | undefined): string[] {
  const key = (fiat || 'NGN').toUpperCase();
  return PAYMENT_METHODS_BY_FIAT[key] || PAYMENT_METHODS_BY_FIAT['NGN'];
}

const FIAT_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵', KES: 'KSh', ZAR: 'R',
  INR: '₹', CNY: '¥', AED: 'AED ', CAD: 'CA$', AUD: 'A$', JPY: '¥', BRL: 'R$',
  TRY: '₺', PKR: '₨', EGP: 'E£', UGX: 'USh', TZS: 'TSh', XOF: 'CFA ',
};

export function fiatSymbol(fiat: string | null | undefined): string {
  const key = (fiat || 'NGN').toUpperCase();
  return FIAT_SYMBOLS[key] || `${key} `;
}

function extractId(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$oid) return raw.$oid;
  return String(raw);
}

function extractDate(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$date) return raw.$date;
  return String(raw);
}

function placeholderName(id?: string): string {
  return id ? `Trader ${id.slice(-6).toUpperCase()}` : 'Merchant';
}

export function normalizeMerchant(raw: any, fallbackId?: string): P2PMerchant {
  const nested = raw && typeof raw === 'object' ? raw.merchant : null;
  const source = nested && typeof nested === 'object' ? nested : raw;

  if (source && typeof source === 'object' && (source.username || source.name)) {
    return {
      id: extractId(source.id || source._id) || fallbackId || '',
      username: source.username || source.name || placeholderName(fallbackId),
      avatarUrl: source.avatarUrl ?? null,
      isVerified: !!source.isVerified,
      isPremium: !!source.isPremium,
      totalTrades: source.totalTrades ?? 0,
      completionRate: source.completionRate ?? 0,
      avgReleaseMinutes: source.avgReleaseMinutes ?? undefined,
    };
  }

  return {
    id: fallbackId || '',
    username: placeholderName(fallbackId),
    avatarUrl: null,
    isVerified: false,
    isPremium: false,
    totalTrades: 0,
    completionRate: 0,
  };
}

export function normalizeOrder(raw: any): P2POrder {
  const traderId = extractId(raw.traderId);
  return {
    id: extractId(raw.id || raw._id),
    type: raw.type,
    coin: raw.coin,
    fiatCurrency: raw.fiatCurrency,
    pricePerUnit: raw.pricePerUnit,
    totalAmount: raw.totalAmount,
    availableAmount: raw.availableAmount,
    minLimit: raw.minLimit,
    maxLimit: raw.maxLimit,
    paymentMethods: raw.paymentMethods || [],
    paymentMethodIds: (raw.paymentMethodIds || []).map(extractId),
    paymentMethodDetails: (raw.paymentMethodDetails || []).map(normalizePaymentMethod),
    terms: raw.terms,
    paymentWindowMinutes: raw.paymentWindowMinutes,
    status: raw.status,
    isListed: raw.isListed ?? raw.status === OrderStatus.Active,
    feePercent: raw.feePercent ?? 0,
    merchant: normalizeMerchant(raw, traderId),
    createdAt: extractDate(raw.createdAt),
  };
}

export function normalizeTrade(raw: any): P2PTrade {
  const buyerFallbackId = extractId(raw.buyerId);
  const sellerFallbackId = extractId(raw.sellerId);

  return {
    id: extractId(raw.id || raw._id),
    order: normalizeOrder(raw.order || { coin: raw.coin, fiatCurrency: raw.fiatCurrency, pricePerUnit: raw.pricePerUnit }),
    buyer: normalizeMerchant(raw.buyer || { username: raw.buyerName }, buyerFallbackId),
    seller: normalizeMerchant(raw.seller || { username: raw.sellerName }, sellerFallbackId),
    isBuyer: typeof raw.isBuyer === 'boolean' ? raw.isBuyer : String(raw.buyerId) === String(raw.viewerId || ''),
    coinAmount: raw.coinAmount,
    fiatAmount: raw.fiatAmount,
    paymentMethod: raw.paymentMethod,
    sellerPaymentMethod: raw.sellerPaymentMethod ? normalizePaymentMethod(raw.sellerPaymentMethod) : undefined,
    status: raw.status,
    paymentDeadline: raw.paymentDeadline ? extractDate(raw.paymentDeadline) : undefined,
    createdAt: extractDate(raw.createdAt),
    paymentProofUrl: raw.paymentProofUrl || undefined,
    paymentProofNote: raw.paymentProofNote || undefined,
    paidAt: raw.paidAt ? extractDate(raw.paidAt) : undefined,
    releasedAt: raw.releasedAt ? extractDate(raw.releasedAt) : undefined,
  };
}

export interface MarkTradePaidReqBody {
  paymentProofUrl: string;
  paymentProofNote?: string;
}

export interface ReleaseTradeReqBody {
  transactionPin?: string;
}

export function canMarkPaid(trade: P2PTrade): boolean {
  return trade.isBuyer && trade.status === TradeStatus.Pending;
}

export function canReleaseFunds(trade: P2PTrade): boolean {
  return !trade.isBuyer && trade.status === TradeStatus.Paid;
}

export function msUntilDeadline(paymentDeadline: string | undefined, nowMs: number = Date.now()): number {
  if (!paymentDeadline) return 0;
  return new Date(paymentDeadline).getTime() - nowMs;
}

export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return 'Expired';
  const totalSeconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export interface ExchangeRateRes {
  coin: string;
  fiatCurrency: string;
  rate: number;
  source?: string;
  timestamp?: string;
}


export function canCancelTrade(trade: P2PTrade): boolean {
  return trade.isBuyer && trade.status === TradeStatus.Pending;
}

export function isPaymentWindowExpired(trade: P2PTrade, nowMs: number = Date.now()): boolean {
  if (trade.status !== TradeStatus.Pending || !trade.paymentDeadline) return false;
  return msUntilDeadline(trade.paymentDeadline, nowMs) <= 0;
}

export function maskAccountNumber(value: string | undefined | null): string {
  if (!value) return '';
  const compact = value.replace(/\s+/g, '');
  if (compact.length <= 4) return compact;
  return `${'•'.repeat(compact.length - 4)}${compact.slice(-4)}`;
}



export type PaymentVerificationStatus = 'pending' | 'verifying' | 'verified' | 'failed';

export interface VerifyPaymentRes {
  status: PaymentVerificationStatus;
  trade?: P2PTrade;
}

