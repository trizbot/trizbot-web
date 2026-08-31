function extractId(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$oid) return raw.$oid;
  return String(raw);
}

export interface RawUserPaymentMethod {
  _id?: string;
  id?: string;
  method: string;          // e.g. 'Opay', 'Bank Transfer'
  accountName: string;
  accountNumber: string;
  bankName?: string;
  accountType?: string;
  additionalInfo?: string;
  fiatCurrency: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface UserPaymentMethod {
  id: string;
  method: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  accountType?: string;
  additionalInfo?: string;
  fiatCurrency: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface CreatePaymentMethodReqBody {
  method: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  accountType?: string;
  additionalInfo?: string;
  fiatCurrency: string;
  isDefault?: boolean;
}

export type UpdatePaymentMethodReqBody = Partial<CreatePaymentMethodReqBody>;

export function normalizePaymentMethod(raw: RawUserPaymentMethod): UserPaymentMethod {
  return {
    id: extractId(raw.id || raw._id),
    method: raw.method,
    accountName: raw.accountName,
    accountNumber: raw.accountNumber,
    bankName: raw.bankName,
    accountType: raw.accountType,
    additionalInfo: raw.additionalInfo,
    fiatCurrency: raw.fiatCurrency,
    isDefault: !!raw.isDefault,
    createdAt: raw.createdAt,
  };
}