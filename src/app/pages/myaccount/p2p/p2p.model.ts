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
  paymentDetails?: PaymentMethodDetail[];
  terms?: string;
  paymentWindowMinutes?: number;
  transactionPin?: string;
}

export interface PaymentMethodDetail {
  method: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  additionalInfo?: string;
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
  paymentDetails?: PaymentMethodDetail[];
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
  sellerPaymentDetails?: PaymentMethodDetail;
  status: TradeStatus;
  paymentDeadline?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Request bodies
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
  paymentDetails?: PaymentMethodDetail[];
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
  sellerPaymentDetails?: PaymentMethodDetail;
}

export const PAYMENT_WINDOW_OPTIONS: number[] = [15, 30, 45];

export const SUPPORTED_COINS: string[] = [
  'USDT', 'BTC', 'ETH', 'USDC', 'SOL', 'BNB', 'CORE', 'XRP', 'LTC',
  'TON', 'TRX', 'DOGE', 'ADA', 'MATIC', 'DOT', 'SHIB', 'AVAX', 'LINK', 'ATOM', 'BCH', 'ETC',
];

export const QUICK_COINS: string[] = ['USDT', 'BTC', 'ETH', 'USDC', 'SOL', 'BNB', 'XRP', 'LTC'];

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
  EGP: ['Vodafone Cash', 'InstaPay', 'Bank Transfer'],
  UGX: ['Solidpyco', 'MTN Mobile Money', 'Airtel Money'],
  TZS: ['M-Pesa', 'Tigo Pesa', 'Airtel Money'],
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
    paymentDetails: raw.paymentDetails || [],
    terms: raw.terms,
    paymentWindowMinutes: raw.paymentWindowMinutes,
    status: raw.status,
    isListed: raw.isListed ?? raw.status === OrderStatus.Active,
    feePercent: raw.feePercent ?? 0,
    merchant: normalizeMerchant(raw, traderId),
    createdAt: extractDate(raw.createdAt),
  };
}

/**
 * FIX: the backend now always sends raw.isBuyer, raw.buyer, raw.seller and
 * a lightweight raw.order snapshot (see P2pService.shapeTradeForViewer).
 * normalizeMerchant already handles raw.buyer/raw.seller correctly since
 * they arrive as { id, username, isVerified } — no change needed there,
 * just make sure we read isBuyer as a real boolean and fall back sensibly
 * if an older/uncached response is missing the new fields.
 */
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
    sellerPaymentDetails: raw.sellerPaymentDetails || undefined,
    status: raw.status,
    paymentDeadline: raw.paymentDeadline ? extractDate(raw.paymentDeadline) : undefined,
    createdAt: extractDate(raw.createdAt),
  };
}

// ---------------------------------------------------------------------
// Payment countdown helpers (Bybit-style mm:ss timer)
// ---------------------------------------------------------------------

/** Milliseconds remaining until a trade's payment deadline. Negative once expired. */
export function msUntilDeadline(paymentDeadline: string | undefined, nowMs: number = Date.now()): number {
  if (!paymentDeadline) return 0;
  return new Date(paymentDeadline).getTime() - nowMs;
}

/** Formats remaining ms as "mm:ss", or "Expired" once the deadline has passed. */
export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return 'Expired';
  const totalSeconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}