export type CourseCategory =
  | 'RiskManagement'
  | 'TechnicalAnalysis'
  | 'CryptoInvestment'
  | 'CryptoTrading'
  | 'BeginnerGuide'
  | 'General'
  | 'Others';

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';


export type CourseCategoryEnum = CourseCategory;
export type CourseLevelEnum = CourseLevel;

export const MAX_INLINE_CONTENT_LENGTH = 20000;


export const MAX_COURSE_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_COURSE_FILE_SIZE_LABEL = '2MB';

/** Returns true if the file is within the allowed upload size. */
export function isFileSizeAllowed(file: File): boolean {
  return file.size <= MAX_COURSE_FILE_SIZE_BYTES;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


export const CATEGORY_OPTIONS: { value: CourseCategory; label: string }[] = [
  { value: 'RiskManagement', label: 'Risk Management' },
  { value: 'TechnicalAnalysis', label: 'Technical Analysis' },
  { value: 'CryptoInvestment', label: 'Crypto Investment' },
  { value: 'CryptoTrading', label: 'Crypto Trading' },
  { value: 'BeginnerGuide', label: "Beginner's Guide"},
  { value: 'General', label: 'General' },
  { value: 'Others', label: 'Others' },
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
  coverPhotoUrl?: string | null;
  pdfUrl?: string | null;
  /** @deprecated renamed to coverPhotoUrl — kept for backward compatibility with older records */
  thumbnailUrl?: string | null;
  /** @deprecated renamed to pdfUrl — kept for backward compatibility with older records */
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
  course: Pick<Course, 'id' | 'title'> & {
    instructor: Pick<CourseInstructor, 'username'>;
    pdfUrl?: string | null;
    attachmentUrl?: string | null;
  };
}

export interface CourseSale {
  id: string;
  reference: string;
  amountEarned: number;
  instructorEarning: number;
  studentName: string;
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
  /** Optional — the dialog's content field has no required validator */
  content?: string;
  price: number;
  category?: CourseCategory;
  level?: CourseLevel;
  coverPhotoUrl?: string;
  pdfUrl?: string;
  /** @deprecated renamed to coverPhotoUrl */
  thumbnailUrl?: string;
  /** @deprecated renamed to pdfUrl */
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



export interface RawCourseDoc {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  content?: string;
  price?: number;
  category?: string;
  level?: string;
  coverPhotoUrl?: string | null;
  pdfUrl?: string | null;
  /** @deprecated renamed to coverPhotoUrl — some existing docs may still only have this */
  thumbnailUrl?: string | null;
  /** @deprecated renamed to pdfUrl — some existing docs may still only have this */
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
    coverPhotoUrl: raw.coverPhotoUrl ?? raw.thumbnailUrl ?? null,
    pdfUrl: raw.pdfUrl ?? raw.attachmentUrl ?? null,
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



// ---- Course Category ----

export interface CourseCategoryItem {
  id: string;
  _id?: string;
  category: string;
  reference?: string;
  entityId?: string;
  createdAt?: string;
}

export interface RawCourseCategoryDoc {
  _id?: string;
  id?: string;
  category: string;
  reference?: string;
  entityId?: string;
  createdAt?: string;
}

export interface CreateCourseCategoryReqBody {
  category?: string;
  reference?: string;
}

export function normalizeCourseCategory(raw: RawCourseCategoryDoc): CourseCategoryItem {
  return {
    id: raw.id || raw._id || '',
    category: raw.category,
    reference: raw.reference,
    entityId: raw.entityId,
    createdAt: raw.createdAt,
  };
}



interface RawNestedCourseRef {
  _id?: string | { $oid: string };
  id?: string | { $oid: string };
  title?: string;
  name?: string;
  pdfUrl?: string | null;
  attachmentUrl?: string | null;
  instructor?: {
    _id?: string;
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
  instructorUsername?: string;
}

interface RawUserRef {
  _id?: string | { $oid: string };
  id?: string | { $oid: string };
  username?: string;
  firstName?: string;
  lastName?: string;
}


export interface RawCoursePurchaseDoc {
  _id?: string | { $oid: string };
  id?: string | { $oid: string };
  reference?: string;
  transactionRef?: string;
  amountPaid?: number;
  amount?: number;
  price?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string | { $date: string };
  updatedAt?: string | { $date: string };
  course?: RawNestedCourseRef | string;
  courseId?: string;
  courseTitle?: string;
  coursePdfUrl?: string;         // flattened alternate, seen when `course` isn't populated
  courseAttachmentUrl?: string;  // flattened alternate
}

export interface RawCourseSaleDoc {
  _id?: string | { $oid: string };
  id?: string | { $oid: string };
  reference?: string;
  transactionRef?: string;
  amountEarned?: number;
  instructorEarning?: number;
  amount?: number;
  status?: string;
  studentName?: string;
  paymentStatus?: string;
  createdAt?: string | { $date: string };
  updatedAt?: string | { $date: string };
  course?: RawNestedCourseRef | string;
  courseId?: string;
  courseTitle?: string;
  buyer?: RawUserRef | string;
  buyerId?: string;
  buyerUsername?: string; // flattened alternate
}

function safeId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '$oid' in (value as any)) return (value as any).$oid;
  return String(value);
}

function safeDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '$date' in (value as any)) return (value as any).$date;
  return String(value);
}

function normalizeNestedCourseRef(
  course: RawNestedCourseRef | string | undefined,
  fallbackId?: string,
  fallbackTitle?: string,
  fallbackPdfUrl?: string,
  fallbackAttachmentUrl?: string,
): Pick<Course, 'id' | 'title'> & {
  instructor: Pick<CourseInstructor, 'username'>;
  pdfUrl?: string | null;
  attachmentUrl?: string | null;
} {
  if (!course || typeof course === 'string') {
    return {
      id: safeId(course) || fallbackId || '',
      title: fallbackTitle || 'Untitled course',
      instructor: { username: 'trader' },
      pdfUrl: fallbackPdfUrl ?? null,
      attachmentUrl: fallbackAttachmentUrl ?? null,
    };
  }

  return {
    id: safeId(course.id ?? course._id) || fallbackId || '',
    title: course.title || course.name || fallbackTitle || 'Untitled course',
    instructor: {
      username: course.instructor?.username || course.instructorUsername || 'trader',
    },
    pdfUrl: course.pdfUrl ?? fallbackPdfUrl ?? null,
    attachmentUrl: course.attachmentUrl ?? fallbackAttachmentUrl ?? null,
  };
}


export function normalizeCoursePurchase(raw: RawCoursePurchaseDoc): CoursePurchase {
  return {
    id: safeId(raw.id ?? raw._id),
    reference: raw.reference || raw.transactionRef || '—',
    amountPaid: raw.amountPaid ?? raw.amount ?? raw.price ?? 0,
    status: (raw.status || raw.paymentStatus || 'pending') as CoursePurchase['status'],
    createdAt: safeDate(raw.createdAt),
    course: normalizeNestedCourseRef(
      raw.course,
      raw.courseId,
      raw.courseTitle,
      raw.coursePdfUrl,
      raw.courseAttachmentUrl,
    ),
  };
}

export function normalizeCourseSale(raw: RawCourseSaleDoc): CourseSale {
  const buyerRaw = raw.buyer;
  const buyerUsername =
    (buyerRaw && typeof buyerRaw === 'object' ? buyerRaw.username : undefined) ||
    raw.buyerUsername ||
    'trader';

  return {
    id: safeId(raw.id ?? raw._id),
    reference: raw.reference || raw.transactionRef || '—',
    amountEarned: raw.amountEarned ?? raw.amount ?? 0,
    studentName: raw.studentName ?? "NA",
    instructorEarning: raw.instructorEarning ?? raw.amount ?? 0,
    status: (raw.status || raw.paymentStatus || 'pending') as CourseSale['status'],
    createdAt: safeDate(raw.createdAt),
    course: {
      id: normalizeNestedCourseRef(raw.course, raw.courseId, raw.courseTitle).id,
      title: normalizeNestedCourseRef(raw.course, raw.courseId, raw.courseTitle).title,
    },
    buyer: { username: buyerUsername },
  };
}