// academy.model.ts

export enum CourseCategoryEnum {
  TechnicalAnalysis = 'TechnicalAnalysis',
  FundamentalAnalysis = 'FundamentalAnalysis',
  RiskManagement = 'RiskManagement',
  Arbitrage = 'Arbitrage',
  P2PTrading = 'P2PTrading',
  Blockchain = 'Blockchain',
  General = 'General',
}

export enum CourseLevelEnum {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
}

export interface CourseInstructor {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl?: string | null;
  isVerified: boolean;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  content: string;
  thumbnailUrl?: string;
  attachmentUrl?: string;
  price: number;
  category?: CourseCategoryEnum;
  level?: CourseLevelEnum;
  tags?: string[];
  instructor: CourseInstructor;
  totalPurchases: number;
  createdAt: string;
}

export interface CoursePurchase {
  id: string;
  course: Course;
  reference: string;
  amountPaid: number;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
}

export interface CourseSale {
  id: string;
  course: Course;
  buyer: CourseInstructor;
  reference: string;
  amountEarned: number;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
}

export interface CourseQueryParams {
  category?: CourseCategoryEnum;
  level?: CourseLevelEnum;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCourseReqBody {
  title: string;
  description?: string;
  content: string;
  thumbnailUrl?: string;
  attachmentUrl?: string;
  price: number;
  category?: CourseCategoryEnum;
  level?: CourseLevelEnum;
  tags?: string[];
}

export type UpdateCourseReqBody = Partial<CreateCourseReqBody>;

export interface PurchaseCourseReqBody {
  courseId: string;
  transactionPin: string;
  reference: string;
}

export const CATEGORY_OPTIONS: { value: CourseCategoryEnum; label: string }[] = [
  { value: CourseCategoryEnum.TechnicalAnalysis, label: 'Technical Analysis' },
  { value: CourseCategoryEnum.FundamentalAnalysis, label: 'Fundamental Analysis' },
  { value: CourseCategoryEnum.RiskManagement, label: 'Risk Management' },
  { value: CourseCategoryEnum.Arbitrage, label: 'Arbitrage' },
  { value: CourseCategoryEnum.P2PTrading, label: 'P2P Trading' },
  { value: CourseCategoryEnum.Blockchain, label: 'Blockchain' },
  { value: CourseCategoryEnum.General, label: 'General' },
];

export const LEVEL_OPTIONS: { value: CourseLevelEnum; label: string }[] = [
  { value: CourseLevelEnum.Beginner, label: 'Beginner' },
  { value: CourseLevelEnum.Intermediate, label: 'Intermediate' },
  { value: CourseLevelEnum.Advanced, label: 'Advanced' },
];

export const MAX_INLINE_CONTENT_LENGTH = 8000;