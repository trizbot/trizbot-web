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
  
  sellerPaymentMethod?: UserPaymentMethod;
  status: TradeStatus;
  paymentDeadline?: string;
  createdAt: string;
  paymentProofUrl?: string;
  paymentProofNote?: string;
  paidAt?: string;
  releasedAt?: string;
  autoReleaseEligible?: boolean;

  
  disputeAgreementConfirmedByBuyer?: boolean;
 
  disputeAgreementConfirmedBySeller?: boolean;
  
  disputeAgreementReachedAt?: string;
  
  disputeEvidenceBuyerUrl?: string;
  disputeEvidenceBuyerNote?: string;
  disputeEvidenceSellerUrl?: string;
  disputeEvidenceSellerNote?: string;
  disputeEscalated?: boolean;
  disputeEscalatedAt?: string;
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
 
  paymentMethodId?: string;
}

export const PAYMENT_WINDOW_OPTIONS: number[] = [15, 30, 45];

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


export function isCompletePaymentMethod(detail: UserPaymentMethod | null | undefined): detail is UserPaymentMethod {
  return !!detail && !!String(detail.method || '').trim() && !!String(detail.accountNumber || '').trim();
}


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

 
  return { ...fallback, method: trimmed };
}


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
   
    sellerPaymentMethod: isCompletePaymentMethod(parsedSellerPaymentMethod) ? parsedSellerPaymentMethod : undefined,
    status: raw.status,
    paymentDeadline: raw.paymentDeadline ? extractDate(raw.paymentDeadline) : undefined,
    createdAt: extractDate(raw.createdAt),
    paymentProofUrl: raw.paymentProofUrl || undefined,
    paymentProofNote: raw.paymentProofNote || undefined,
    paidAt: raw.paidAt ? extractDate(raw.paidAt) : undefined,
    releasedAt: raw.releasedAt ? extractDate(raw.releasedAt) : undefined,
    autoReleaseEligible: raw.autoReleaseEligible ?? undefined,

    // ---- Dispute resolution ----
    disputeAgreementConfirmedByBuyer: raw.disputeAgreementConfirmedByBuyer ?? false,
    disputeAgreementConfirmedBySeller: raw.disputeAgreementConfirmedBySeller ?? false,
    disputeAgreementReachedAt: raw.disputeAgreementReachedAt ? extractDate(raw.disputeAgreementReachedAt) : undefined,
    disputeEvidenceBuyerUrl: raw.disputeEvidenceBuyerUrl || undefined,
    disputeEvidenceBuyerNote: raw.disputeEvidenceBuyerNote || undefined,
    disputeEvidenceSellerUrl: raw.disputeEvidenceSellerUrl || undefined,
    disputeEvidenceSellerNote: raw.disputeEvidenceSellerNote || undefined,
    disputeEscalated: raw.disputeEscalated ?? false,
    disputeEscalatedAt: raw.disputeEscalatedAt ? extractDate(raw.disputeEscalatedAt) : undefined,
  };
}

export interface MarkTradePaidReqBody {
  paymentProofUrl: string;
  paymentProofNote?: string;
}

export interface ReleaseTradeReqBody {
  transactionPin?: string;
}

/** Payload for uploading dispute evidence (either side, once the fixed
 *  15-minute post-agreement release window has lapsed without a release). */
export interface DisputeEvidenceReqBody {
  evidenceUrl: string;
  note?: string;
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

// =============================================================================
// Dispute resolution — chat-negotiated agreement + fixed 15-minute release
// =============================================================================

/** Constant, non-configurable window: once both parties confirm they've
 *  reached an agreement in the dispute chat, the seller has exactly this
 *  long to release funds before both sides are asked for evidence. */
export const DISPUTE_AGREEMENT_RELEASE_WINDOW_MS = 15 * 60 * 1000;

export function disputeAgreementReached(trade: P2PTrade): boolean {
  return !!trade.disputeAgreementReachedAt;
}

export function disputeReleaseDeadlineMs(trade: P2PTrade): number | null {
  if (!trade.disputeAgreementReachedAt) return null;
  return new Date(trade.disputeAgreementReachedAt).getTime() + DISPUTE_AGREEMENT_RELEASE_WINDOW_MS;
}

export function msUntilDisputeReleaseDeadline(trade: P2PTrade, nowMs: number = Date.now()): number {
  const deadline = disputeReleaseDeadlineMs(trade);
  if (deadline == null) return 0;
  return deadline - nowMs;
}

/** True once the agreed 15-minute window has actually run out. Only
 *  meaningful for a Disputed trade where both sides already agreed. */
export function isDisputeReleaseWindowExpired(trade: P2PTrade, nowMs: number = Date.now()): boolean {
  if (trade.status !== TradeStatus.Disputed) return false;
  const deadline = disputeReleaseDeadlineMs(trade);
  if (deadline == null) return false;
  return nowMs >= deadline;
}

/** Seller can release directly out of a Disputed trade only inside the
 *  fixed 15-minute window that opens once BOTH sides confirm they've
 *  reached an agreement in the dispute chat, and only while that window
 *  hasn't lapsed yet. */
export function canReleaseDisputedFunds(trade: P2PTrade, nowMs: number = Date.now()): boolean {
  if (trade.isBuyer) return false;
  if (trade.status !== TradeStatus.Disputed) return false;
  if (!disputeAgreementReached(trade)) return false;
  return !isDisputeReleaseWindowExpired(trade, nowMs);
}

export function hasSubmittedDisputeEvidence(trade: P2PTrade): boolean {
  return trade.isBuyer ? !!trade.disputeEvidenceBuyerUrl : !!trade.disputeEvidenceSellerUrl;
}

export function counterpartyHasSubmittedDisputeEvidence(trade: P2PTrade): boolean {
  return trade.isBuyer ? !!trade.disputeEvidenceSellerUrl : !!trade.disputeEvidenceBuyerUrl;
}

export function myDisputeAgreementConfirmed(trade: P2PTrade): boolean {
  return trade.isBuyer ? !!trade.disputeAgreementConfirmedByBuyer : !!trade.disputeAgreementConfirmedBySeller;
}

export function counterpartyDisputeAgreementConfirmed(trade: P2PTrade): boolean {
  return trade.isBuyer ? !!trade.disputeAgreementConfirmedBySeller : !!trade.disputeAgreementConfirmedByBuyer;
}