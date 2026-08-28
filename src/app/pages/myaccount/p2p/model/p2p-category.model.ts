export interface RawP2pCategoryDoc {
  _id: string;
  category: string;
  reference?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface P2pCategoryItem {
  id: string;
  category: string;
  reference?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiListResponse<T> {
  message: string;
  data: T[];
}

export interface CreateP2pCategoryPayload {
  category: string;
  reference?: string;
}

export interface UpdateP2pCategoryPayload {
  category?: string;
  reference?: string;
}

function extractId(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$oid) return raw.$oid;
  return String(raw);
}

export function normalizeP2pCategory(raw: RawP2pCategoryDoc): P2pCategoryItem {
  return {
    id: extractId((raw as any).id || raw._id),
    category: raw.category,
    reference: raw.reference,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}


export function unwrapCategoryList<T>(res: T | T[] | ApiListResponse<T>): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && Array.isArray((res as ApiListResponse<T>).data)) {
    return (res as ApiListResponse<T>).data;
  }
  return res ? [res as T] : [];
}