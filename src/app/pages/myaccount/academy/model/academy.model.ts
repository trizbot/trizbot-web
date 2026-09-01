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



export type CourseFileKind = 'pdf' | 'docx' | 'word' | 'audio' | 'video' | 'other';

export const FILE_KIND_ACCEPT: Record<Exclude<CourseFileKind, 'other'>, string[]> = {
  pdf: ['application/pdf'],
  docx: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
  word: []
};

/** Comma-separated `accept` attribute value for the upload input, per kind. */
export const FILE_KIND_ACCEPT_ATTR: Record<Exclude<CourseFileKind, 'other'>, string> = {
  pdf: '.pdf,application/pdf',
  docx: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  audio: '.mp3,.wav,.m4a,.aac,.ogg,audio/*',
  video: '.mp4,.webm,.mov,.mkv,video/*',
  word: ""
};


export const MAX_FILE_SIZE_BY_KIND: Record<Exclude<CourseFileKind, 'other'>, number> = {
  pdf: 20 * 1024 * 1024, // 20MB
  docx: 20 * 1024 * 1024, // 20MB
  audio: 75 * 1024 * 1024, // 75MB
  video: 500 * 1024 * 1024,
  word: 0
};

export const MAX_FILE_SIZE_LABEL_BY_KIND: Record<Exclude<CourseFileKind, 'other'>, string> = {
  pdf: '20MB',
  docx: '20MB',
  audio: '75MB',
  video: '500MB',
  word: ""
};

export const FILE_KIND_LABEL: Record<CourseFileKind, string> = {
  pdf: 'PDF',
  docx: 'Word document',
  audio: 'Audio lesson',
  video: 'Video lesson',
  other: 'File',
  word: ""
};

export const FILE_KIND_ICON: Record<CourseFileKind, string> = {
  pdf: 'picture_as_pdf',
  docx: 'description',
  audio: 'audiotrack',
  video: 'movie',
  other: 'insert_drive_file',
  word: ""
};

/** Detects the course-file kind from a browser File, falling back to its extension. */
export function detectFileKind(file: File): CourseFileKind {
  const mime = (file.type || '').toLowerCase();
  const kinds = Object.keys(FILE_KIND_ACCEPT) as Exclude<CourseFileKind, 'other'>[];
  for (const kind of kinds) {
    if (FILE_KIND_ACCEPT[kind].includes(mime)) return kind;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return 'video';
  return 'other';
}

/** Detects a course-file kind from a stored URL when only the URL is known. */
export function detectFileKindFromUrl(url?: string | null): CourseFileKind {
  if (!url) return 'other';
  const clean = url.split('?')[0].toLowerCase();
  const ext = clean.split('.').pop() || '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return 'video';
  return 'other';
}

export const MAX_COURSE_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — cover photo only now
export const MAX_COURSE_FILE_SIZE_LABEL = '2MB';

/** Returns true if the file is within the allowed upload size for its kind. */
export function isFileSizeAllowed(file: File, kind: CourseFileKind = 'pdf'): boolean {
  if (kind === 'other') return file.size <= MAX_COURSE_FILE_SIZE_BYTES;
  return file.size <= MAX_FILE_SIZE_BY_KIND[kind];
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
  { value: 'BeginnerGuide', label: "Beginner's Guide" },
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
  userName: string;
  avatarUrl?: string | null;
  instructorName?: string | null;
  isVerified?: boolean;

  /**
   * Seller payout details, shown to a buyer before they pay for a paid
   * course so they know who / where the funds settle to. All optional —
   * older records or unverified sellers may not have payout details on file.
   */
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
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

  /** Generic course-material file — can be a PDF, DOCX, audio, or video lesson. */
  courseFileUrl?: string | null;
  courseFileKind?: CourseFileKind | null;
  courseFileName?: string | null;

  /** @deprecated renamed to coverPhotoUrl — kept for backward compatibility with older records */
  thumbnailUrl?: string | null;
  /**
   * @deprecated renamed to courseFileUrl — kept for backward compatibility.
   * Old records only ever stored PDFs here.
   */
  pdfUrl?: string | null;
  /** @deprecated renamed to courseFileUrl — kept for backward compatibility with older records */
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
  coursePrice: number;
  status: 'pending' | 'completed' | 'failed' | string;
  createdAt: string;
  userName?: string;
  instructorName?: string;
  course: Pick<Course, 'id' | 'title'> & {
    instructor: Pick<CourseInstructor, 'userName'>;
    courseFileUrl?: string | null;
    courseFileKind?: CourseFileKind | null;
    courseFileName?: any | null;
    /** @deprecated */
    pdfUrl?: any | null;
    /** @deprecated */
    attachmentUrl?: any | null;
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

  courseFileUrl?: string;
  courseFileKind?: CourseFileKind;
  courseFileName?: string;

  /** @deprecated renamed to coverPhotoUrl */
  thumbnailUrl?: string;
  /** @deprecated renamed to courseFileUrl */
  pdfUrl?: string;
  /** @deprecated renamed to courseFileUrl */
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

  courseFileUrl?: string | null;
  courseFileKind?: string | null;
  courseFileName?: string | null;

  /** @deprecated renamed to coverPhotoUrl — some existing docs may still only have this */
  thumbnailUrl?: string | null;
  /** @deprecated renamed to courseFileUrl — some existing docs may still only have this */
  pdfUrl?: string | null;
  /** @deprecated renamed to courseFileUrl — some existing docs may still only have this */
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
  instructorBankName?: string;
  instructorAccountNumber?: string;
  instructorAccountName?: string;
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
    userName:
      raw.instructor?.userName ||
      raw.instructorUsername ||
      (raw.instructorName || 'trader').toLowerCase().replace(/\s+/g, ''),
    avatarUrl: raw.instructor?.avatarUrl ?? raw.instructorAvatarUrl ?? null,
    isVerified: raw.instructor?.isVerified ?? raw.instructorVerified ?? false,
    bankName: raw.instructor?.bankName ?? raw.instructorBankName ?? null,
    accountNumber: raw.instructor?.accountNumber ?? raw.instructorAccountNumber ?? null,
    accountName: raw.instructor?.accountName ?? raw.instructorAccountName ?? null,
  };

  // Resolve the generic course file, falling back through legacy fields.
  const courseFileUrl = raw.courseFileUrl ?? raw.pdfUrl ?? raw.attachmentUrl ?? null;
  const courseFileKind =
    (raw.courseFileKind as CourseFileKind | undefined) ??
    (courseFileUrl ? detectFileKindFromUrl(courseFileUrl) : null);

  return {
    id: extractId(raw._id ?? raw.id),
    title: raw.title || 'Untitled course',
    description: raw.description || '',
    content: raw.content || '',
    price: typeof raw.price === 'number' ? raw.price : 0,
    category: (raw.category as CourseCategory) || 'General',
    level: (raw.level as CourseLevel) || 'Beginner',
    coverPhotoUrl: raw.coverPhotoUrl ?? raw.thumbnailUrl ?? null,

    courseFileUrl,
    courseFileKind: courseFileKind ?? null,
    courseFileName: raw.courseFileName ?? null,

    thumbnailUrl: raw.thumbnailUrl || null,
    pdfUrl: raw.pdfUrl || null,
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
  courseFileUrl?: string | null;
  courseFileKind?: string | null;
  courseFileName?: string | null;
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
  coursePrice?: number;
  amount?: number;
  price?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string | { $date: string };
  updatedAt?: string | { $date: string };
  course?: RawNestedCourseRef | string;
  courseId?: string;
  userName?: string;
  instructorName?: string;
  courseTitle?: string;
  // flattened alternates, seen when `course` isn't populated
  courseFileUrl?: string;
  courseFileKind?: string;
  courseFileName?: string;
  coursePdfUrl?: string;
  courseAttachmentUrl?: string;
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
  fallbackFileUrl?: string,
  fallbackFileKind?: string,
  fallbackFileName?: string,
): Pick<Course, 'id' | 'title'> & {
  instructor: Pick<CourseInstructor, 'userName'>;
  courseFileUrl?: string | null;
  courseFileKind?: CourseFileKind | null;
  courseFileName?: string | null;
  pdfUrl?: string | null;
  attachmentUrl?: string | null;
} {
  if (!course || typeof course === 'string') {
    const fileUrl = fallbackFileUrl ?? null;
    return {
      id: safeId(course) || fallbackId || '',
      title: fallbackTitle || 'Untitled course',
      instructor: { userName: 'trader' },
      courseFileUrl: fileUrl,
      courseFileKind: ((fallbackFileKind as CourseFileKind) || (fileUrl ? detectFileKindFromUrl(fileUrl) : null)) ?? null,
      courseFileName: fallbackFileName ?? null,
      pdfUrl: fileUrl,
      attachmentUrl: fileUrl,
    };
  }

  const fileUrl = course.courseFileUrl ?? course.pdfUrl ?? course.attachmentUrl ?? fallbackFileUrl ?? null;
  const fileKind =
    ((course.courseFileKind as CourseFileKind) || (fallbackFileKind as CourseFileKind)) ??
    (fileUrl ? detectFileKindFromUrl(fileUrl) : null);

  return {
    id: safeId(course.id ?? course._id) || fallbackId || '',
    title: course.title || course.name || fallbackTitle || 'Untitled course',
    instructor: {
      userName: course.instructor?.username || course.instructorUsername || 'trader',
    },
    courseFileUrl: fileUrl,
    courseFileKind: fileKind ?? null,
    courseFileName: course.courseFileName ?? fallbackFileName ?? null,
    pdfUrl: course.pdfUrl ?? fileUrl,
    attachmentUrl: course.attachmentUrl ?? fileUrl,
  };
}

export function normalizeCoursePurchase(raw: RawCoursePurchaseDoc): CoursePurchase {
  return {
    id: safeId(raw.id ?? raw._id),
    reference: raw.reference || raw.transactionRef || '—',
    coursePrice: raw.coursePrice ?? 0,
    userName: raw.instructorName ?? "0",
    amountPaid: raw.amountPaid ?? raw.amount ?? raw.price ?? 0,
    status: (raw.status || raw.paymentStatus || 'pending') as CoursePurchase['status'],
    createdAt: safeDate(raw.createdAt),
    course: normalizeNestedCourseRef(
      raw.course,
      raw.courseId,
      raw.courseTitle,
      raw.courseFileUrl ?? raw.coursePdfUrl ?? raw.courseAttachmentUrl,
      raw.courseFileKind,
      raw.courseFileName,
    ),
  };
}

export function normalizeCourseSale(raw: RawCourseSaleDoc): CourseSale {
  const buyerRaw = raw.buyer;
  const buyerUsername =
    (buyerRaw && typeof buyerRaw === 'object' ? buyerRaw.username : undefined) || raw.buyerUsername || 'trader';

  const nested = normalizeNestedCourseRef(raw.course, raw.courseId, raw.courseTitle);

  return {
    id: safeId(raw.id ?? raw._id),
    reference: raw.reference || raw.transactionRef || '—',
    amountEarned: raw.amountEarned ?? raw.amount ?? 0,
    studentName: raw.studentName ?? 'NA',
    instructorEarning: raw.instructorEarning ?? raw.amount ?? 0,
    status: (raw.status || raw.paymentStatus || 'pending') as CourseSale['status'],
    createdAt: safeDate(raw.createdAt),
    course: {
      id: nested.id,
      title: nested.title,
    },
    buyer: { username: buyerUsername },
  };
}

// =============================================================================
// SOCIAL SHARING — used once a course is purchased so a learner can post about
// it professionally (LinkedIn, X/Twitter, WhatsApp, Facebook, email, or copy).
// =============================================================================

export interface CourseShareLinks {
  linkedin: string;
  twitter: string;
  whatsapp: string;
  facebook: string;
  email: string;
}


export function buildCourseShareText(
  courseTitle: string,
  instructorUsername?: string
): string {
  const instructorLine = instructorUsername
    ? ` taught by @${instructorUsername}`
    : '';

  return `I just purchased "${courseTitle}"${instructorLine} on Trizbot Academy. Excited to get started! 🎓`;
}


export function buildCourseSellShareText(courseTitle: string): string {
  return `Check out my course "${courseTitle}" on Trizbot Academy — learn the strategies that work.`;
}


export function buildCourseShareLinks(url: string, text: string): CourseShareLinks {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent('Check out this course')}&body=${encodedText}%20${encodedUrl}`,
  };
}