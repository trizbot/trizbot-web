export type CourseCategory =
  | 'RiskManagement'
  | 'TechnicalAnalysis'
  | 'FundamentalAnalysis'
  | 'CryptoTrading'
  | 'Forex'
  | 'General';

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';

// Aliases so either naming convention works across the module — the
// create-course dialog imports the "Enum" suffix, everything else uses
// the bare names. Both point at the same underlying type.
export type CourseCategoryEnum = CourseCategory;
export type CourseLevelEnum = CourseLevel;

export const MAX_INLINE_CONTENT_LENGTH = 20000;

export const CATEGORY_OPTIONS: { value: CourseCategory; label: string }[] = [
  { value: 'RiskManagement', label: 'Risk Management' },
  { value: 'TechnicalAnalysis', label: 'Technical Analysis' },
  { value: 'FundamentalAnalysis', label: 'Fundamental Analysis' },
  { value: 'CryptoTrading', label: 'Crypto Trading' },
  { value: 'Forex', label: 'Forex' },
  { value: 'General', label: 'General' },
];

export const LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
];

export interface CourseInstructor {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  content?: string;
  price: number;
  category: CourseCategory;
  level: CourseLevel;
  thumbnailUrl?: string | null;
  attachmentUrl?: string | null;
  tags: string[];
  isPublished: boolean;
  totalPurchases: number;
  instructor: CourseInstructor;
  createdAt: string;
  updatedAt: string;
}

export interface CoursePurchase {
  id: string;
  reference: string;
  amountPaid: number;
  status: 'pending' | 'completed' | 'failed' | string;
  createdAt: string;
  course: Pick<Course, 'id' | 'title'> & { instructor: Pick<CourseInstructor, 'username'> };
}

export interface CourseSale {
  id: string;
  reference: string;
  amountEarned: number;
  status: 'pending' | 'completed' | 'failed' | string;
  createdAt: string;
  course: Pick<Course, 'id' | 'title'>;
  buyer: { username: string };
}

export interface CourseQueryParams {
  search?: string;
  category?: CourseCategory;
  level?: CourseLevel;
  page?: number;
  limit?: number;
}

export interface CreateCourseReqBody {
  title: string;
  description?: string;
  content: string;
  price: number;
  category?: CourseCategory;
  level?: CourseLevel;
  thumbnailUrl?: string;
  attachmentUrl?: string;
  tags?: string[];
  isPublished?: boolean;
}

export type UpdateCourseReqBody = Partial<CreateCourseReqBody>;

export interface PurchaseCourseReqBody {
  courseId: string;
  reference: string;
  transactionPin?: string; // omitted entirely for free courses
}

/**
 * ---------------------------------------------------------------------
 * Raw API shape.
 * The backend currently returns near-raw Mongo documents (see sample
 * payload: `_id`, `instructorId`, `instructorName`, `purchaseCount`,
 * `createdAt: { $date }`, etc). Normalizing that into the UI-facing
 * `Course` shape lives in one place (the service) so the component and
 * template never have to guess about field names.
 * ---------------------------------------------------------------------
 */
export interface RawCourseDoc {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  content?: string;
  price?: number;
  category?: string;
  level?: string;
  thumbnailUrl?: string | null;
  attachmentUrl?: string | null;
  tags?: string[];
  isPublished?: boolean;
  purchaseCount?: number;
  totalPurchases?: number;
  instructorId?: string | { $oid: string };
  instructorName?: string;
  instructor?: Partial<CourseInstructor>;
  instructorUsername?: string;
  instructorAvatarUrl?: string;
  instructorVerified?: boolean;
  createdAt?: string | { $date: string };
  updatedAt?: string | { $date: string };
}

function extractId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '$oid' in (value as any)) return (value as any).$oid;
  return String(value);
}

function extractDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '$date' in (value as any)) return (value as any).$date;
  return String(value);
}

/** Splits a "First Last" display name into first/last, with safe fallbacks. */
function splitName(fullName?: string): { firstName: string; lastName: string } {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { firstName: 'Unknown', lastName: 'Instructor' };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || '',
  };
}

/** Converts a raw API/Mongo course document into the UI-facing Course model. */
export function normalizeCourse(raw: RawCourseDoc): Course {
  const { firstName, lastName } = raw.instructor
    ? { firstName: raw.instructor.firstName || '', lastName: raw.instructor.lastName || '' }
    : splitName(raw.instructorName);

  const instructor: CourseInstructor = {
    id: extractId(raw.instructor?.id ?? raw.instructorId),
    firstName: firstName || 'Unknown',
    lastName: lastName || '',
    username:
      raw.instructor?.username || raw.instructorUsername || (raw.instructorName || 'trader').toLowerCase().replace(/\s+/g, ''),
    avatarUrl: raw.instructor?.avatarUrl ?? raw.instructorAvatarUrl ?? null,
    isVerified: raw.instructor?.isVerified ?? raw.instructorVerified ?? false,
  };

  return {
    id: extractId(raw._id ?? raw.id),
    title: raw.title || 'Untitled course',
    description: raw.description || '',
    content: raw.content || '',
    price: typeof raw.price === 'number' ? raw.price : 0,
    category: (raw.category as CourseCategory) || 'General',
    level: (raw.level as CourseLevel) || 'Beginner',
    thumbnailUrl: raw.thumbnailUrl || null,
    attachmentUrl: raw.attachmentUrl || null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    isPublished: raw.isPublished ?? true,
    totalPurchases: raw.totalPurchases ?? raw.purchaseCount ?? 0,
    instructor,
    createdAt: extractDate(raw.createdAt),
    updatedAt: extractDate(raw.updatedAt),
  };
}