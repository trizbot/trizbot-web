export interface RawUserPaymentMethod {
  _id?: string;
  id?: string;
  method: string;
  fiatCurrency: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  additionalInfo?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface UserPaymentMethod {
  id: string;
  method: string;
  fiatCurrency: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  additionalInfo?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface SavePaymentMethodPayload {
  method: string;
  fiatCurrency: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  additionalInfo?: string;
  isDefault?: boolean;
}

function extractId(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$oid) return raw.$oid;
  return String(raw);
}

export function normalizePaymentMethod(raw: RawUserPaymentMethod): UserPaymentMethod {
  return {
    id: extractId(raw.id || raw._id),
    method: raw.method,
    fiatCurrency: raw.fiatCurrency,
    accountName: raw.accountName,
    accountNumber: raw.accountNumber,
    bankName: raw.bankName,
    additionalInfo: raw.additionalInfo,
    isDefault: !!raw.isDefault,
    createdAt: raw.createdAt,
  };
}