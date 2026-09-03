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
  paymentDetails?: string[];
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
  paymentDetails?: string[];

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
  paymentDetails?: string[];
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

/**
 * A payment detail is only useful to show/trade against if it actually
 * carries a method name AND an account number. Previously the code treated
 * "an object exists" as "resolved", which let a blank-fielded object render
 * an empty card (and, worse, leave the Buy button enabled). Everything
 * downstream (component getters, template) should gate on this instead of
 * on truthiness of the object alone.
 */
export function isCompletePaymentMethod(detail: UserPaymentMethod | null | undefined): detail is UserPaymentMethod {
  return !!detail && !!String(detail.method || '').trim() && !!String(detail.accountNumber || '').trim();
}

/**
 * FIX: the backend stores/returns the seller's payment info as a flattened
 * string in `paymentDetails` (it never reliably sends back a structured
 * `paymentMethodDetails` array). The template renders `detail.method` /
 * `detail.accountName` / `detail.accountNumber`, so those fields were
 * rendering blank whenever the raw string didn't match one exact separator
 * pattern.
 *
 * This now tries several real-world formats people actually save data in,
 * in order of specificity:
 *
 *   1. JSON object string                → {"method":"...","accountName":"...","accountNumber":"..."}
 *   2. "Method: Name - Number"           → colon then dash (original format)
 *   3. "Method - Name - Number"          → all dash-separated
 *   4. "Method: Number"                  → colon only, no separate name
 *   5. anything else                     → whole string treated as the method,
 *                                           name/number left blank (caller
 *                                           should treat this as incomplete)
 *
 * Exported so components can call it defensively on an order/trade object
 * even when that object didn't come through normalizeOrder().
 */
export function parsePaymentDetailString(
  raw: string | UserPaymentMethod,
  fiatCurrency: string,
  id?: string
): UserPaymentMethod {
  const fallback: UserPaymentMethod = {
    id: id || '',
    method: '',
    accountName: '',
    accountNumber: '',
    fiatCurrency,
    isDefault: false,
  };

  // Already a structured object (some payloads mix shapes) — normalize and pass through.
  if (raw && typeof raw === 'object') {
    return {
      ...fallback,
      ...raw,
      id: (raw as any).id || id || '',
      fiatCurrency: (raw as any).fiatCurrency || fiatCurrency,
    };
  }

  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // 1. JSON string
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        id: id || parsed.id || '',
        method: parsed.method || parsed.paymentMethod || '',
        accountName: parsed.accountName || parsed.name || '',
        accountNumber: parsed.accountNumber || parsed.account || '',
        bankName: parsed.bankName || undefined,
        additionalInfo: parsed.additionalInfo || undefined,
        fiatCurrency: parsed.fiatCurrency || fiatCurrency,
        isDefault: false,
      };
    } catch {
      // fall through to string parsing below
    }
  }

  // 2. "Method: Name - Number"  (also tolerates "Method : Name-Number")
  const colonDashMatch = trimmed.match(/^(.+?)\s*:\s*(.+?)\s*-\s*(.+)$/);
  if (colonDashMatch) {
    return {
      id: id || '',
      method: colonDashMatch[1].trim(),
      accountName: colonDashMatch[2].trim(),
      accountNumber: colonDashMatch[3].trim(),
      fiatCurrency,
      isDefault: false,
    };
  }

  // 3. "Method - Name - Number"
  const dashParts = trimmed.split(/\s+-\s+/);
  if (dashParts.length >= 3) {
    return {
      id: id || '',
      method: dashParts[0].trim(),
      accountName: dashParts[1].trim(),
      accountNumber: dashParts.slice(2).join(' - ').trim(),
      fiatCurrency,
      isDefault: false,
    };
  }
  if (dashParts.length === 2) {
    // Ambiguous: could be "Method - Number" (no name) — treat the second
    // part as the account number since that's the field that actually
    // matters for sending money.
    return {
      id: id || '',
      method: dashParts[0].trim(),
      accountName: '',
      accountNumber: dashParts[1].trim(),
      fiatCurrency,
      isDefault: false,
    };
  }

  // 4. "Method: Number" (colon only, no dash at all)
  const colonOnlyMatch = trimmed.match(/^(.+?)\s*:\s*(.+)$/);
  if (colonOnlyMatch) {
    return {
      id: id || '',
      method: colonOnlyMatch[1].trim(),
      accountName: '',
      accountNumber: colonOnlyMatch[2].trim(),
      fiatCurrency,
      isDefault: false,
    };
  }

  // 5. Nothing recognizable — surface the raw text as the method so support
  // can see what was actually stored, but leave accountNumber blank so
  // isCompletePaymentMethod() correctly flags this as unusable rather than
  // silently rendering a blank-looking card.
  return { ...fallback, method: trimmed };
}

/**
 * Builds the structured `paymentMethodDetails` array a Sell ad needs for
 * display, preferring a real structured array from the backend if one is
 * ever added, and otherwise falling back to parsing the flattened
 * `paymentDetails` strings that are already being saved today.
 *
 * Incomplete entries (missing method or account number after parsing) are
 * filtered out here so callers never have to special-case them — a filtered
 * list simply "has no attached account" from their point of view.
 */
export function buildPaymentMethodDetails(
  existing: UserPaymentMethod[] | undefined,
  flatDetails: string[] | undefined,
  paymentMethodIds: string[] | undefined,
  fiatCurrency: string | undefined
): UserPaymentMethod[] {
  const fiat = fiatCurrency || 'NGN';

  if (existing?.length) {
    return existing.filter(isCompletePaymentMethod);
  }

  const details = Array.isArray(flatDetails) ? flatDetails : [];
  if (!details.length) return [];

  const ids = Array.isArray(paymentMethodIds) ? paymentMethodIds : [];

  return details
    .map((s, i) => parsePaymentDetailString(s, fiat, ids[i]))
    .filter(isCompletePaymentMethod);
}

function resolvePaymentMethodDetails(raw: any): UserPaymentMethod[] {
  const structured = Array.isArray(raw.paymentMethodDetails) && raw.paymentMethodDetails.length
    ? raw.paymentMethodDetails.map(normalizePaymentMethod)
    : undefined;

  return buildPaymentMethodDetails(
    structured,
    raw.paymentDetails,
    (raw.paymentMethodIds || []).map(extractId),
    raw.fiatCurrency
  );
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
    paymentDetails: raw.paymentDetails || [],
    // FIX: was `(raw.paymentMethodDetails || []).map(normalizePaymentMethod)`,
    // which is always empty because the backend never reliably populates
    // that field. Now falls back to robustly parsing the flattened
    // `paymentDetails` strings, and drops any entry that still comes out
    // incomplete instead of letting it render blank.
    paymentMethodDetails: resolvePaymentMethodDetails(raw),
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

  const parsedSellerPaymentMethod = raw.sellerPaymentMethod
    ? normalizePaymentMethod(raw.sellerPaymentMethod)
    : undefined;

  return {
    id: extractId(raw.id || raw._id),
    order: normalizeOrder(raw.order || { coin: raw.coin, fiatCurrency: raw.fiatCurrency, pricePerUnit: raw.pricePerUnit }),
    buyer: normalizeMerchant(raw.buyer || { username: raw.buyerName }, buyerFallbackId),
    seller: normalizeMerchant(raw.seller || { username: raw.sellerName }, sellerFallbackId),
    isBuyer: typeof raw.isBuyer === 'boolean' ? raw.isBuyer : String(raw.buyerId) === String(raw.viewerId || ''),
    coinAmount: raw.coinAmount,
    fiatAmount: raw.fiatAmount,
    paymentMethod: raw.paymentMethod,
    // FIX: same completeness gate applies to a trade's locked-in seller
    // payment method — only keep it if it's actually usable, otherwise let
    // the component fall back to the order's resolved details.
    sellerPaymentMethod: isCompletePaymentMethod(parsedSellerPaymentMethod) ? parsedSellerPaymentMethod : undefined,
    status: raw.status,
    paymentDeadline: raw.paymentDeadline ? extractDate(raw.paymentDeadline) : undefined,
    createdAt: extractDate(raw.createdAt),
    paymentProofUrl: raw.paymentProofUrl || undefined,
    paymentProofNote: raw.paymentProofNote || undefined,
    paidAt: raw.paidAt ? extractDate(raw.paidAt) : undefined,
    releasedAt: raw.releasedAt ? extractDate(raw.releasedAt) : undefined,
    autoReleaseEligible: raw.autoReleaseEligible ?? undefined,
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