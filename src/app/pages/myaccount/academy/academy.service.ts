import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  Course,
  CourseCategoryItem,
  CoursePurchase,
  CourseQueryParams,
  CourseSale,
  CreateCourseCategoryReqBody,
  CreateCourseReqBody,
  normalizeCourse,
  normalizeCourseCategory,
  normalizeCoursePurchase,
  normalizeCourseSale,
  PurchaseCourseReqBody,
  RawCourseCategoryDoc,
  RawCourseDoc,
  RawCoursePurchaseDoc,
  RawCourseSaleDoc,
  UpdateCourseReqBody,
} from './model/academy.model';

interface ApiListResponse<T> {
  data?: T[];
  items?: T[];
}

function unwrapList<T>(res: T[] | ApiListResponse<T>): T[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? res?.items ?? [];
}

/**
 * The category endpoints may return either a single created/updated doc, a
 * bare array, or a { data / items } wrapper depending on the backend
 * response shape — this normalizes all three into an array.
 */
function unwrapCategoryList(
  res: RawCourseCategoryDoc | RawCourseCategoryDoc[] | ApiListResponse<RawCourseCategoryDoc>,
): RawCourseCategoryDoc[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'category' in (res as RawCourseCategoryDoc)) {
    return [res as RawCourseCategoryDoc];
  }
  return (res as ApiListResponse<RawCourseCategoryDoc>)?.data
    ?? (res as ApiListResponse<RawCourseCategoryDoc>)?.items
    ?? [];
}

/** Body accepted by PATCH /academy/category/:id — mirrors ListCourseCategoryDto. */
export interface UpdateCourseCategoryReqBody {
  category?: string;
  reference?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AcademyService {
  private readonly baseUrl = `${environment.apiBaseUrl}/academy`;

  constructor(private http: HttpClient, private router: Router) {}

  // ---- Courses ----

  getCourses(params: CourseQueryParams): Observable<Course[]> {
    let httpParams = new HttpParams();
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.level) httpParams = httpParams.set('level', params.level);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);

    return this.http
      .get<RawCourseDoc[] | ApiListResponse<RawCourseDoc>>(`${this.baseUrl}/courses`, {
        params: httpParams,
      })
      .pipe(map((res) => unwrapList(res).map(normalizeCourse)));
  }

  getCourseById(id: string): Observable<Course> {
    return this.http
      .get<RawCourseDoc>(`${this.baseUrl}/courses/${id}`)
      .pipe(map(normalizeCourse));
  }

  myCourses(): Observable<Course[]> {
    return this.http
      .get<RawCourseDoc[] | ApiListResponse<RawCourseDoc>>(`${this.baseUrl}/courses/mine`)
      .pipe(map((res) => unwrapList(res).map(normalizeCourse)));
  }

  createCourse(payload: CreateCourseReqBody): Observable<Course> {
    return this.http
      .post<RawCourseDoc>(`${this.baseUrl}/courses`, payload)
      .pipe(map(normalizeCourse));
  }

  updateCourse(id: string, payload: UpdateCourseReqBody): Observable<Course> {
    return this.http
      .patch<RawCourseDoc>(`${this.baseUrl}/courses/${id}`, payload)
      .pipe(map(normalizeCourse));
  }

  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/courses/${id}`);
  }

  // ---- Purchases ----

  purchaseCourse(payload: PurchaseCourseReqBody): Observable<CoursePurchase> {
    return this.http
      .post<RawCoursePurchaseDoc>(`${this.baseUrl}/purchase`, payload)
      .pipe(map(normalizeCoursePurchase));
  }

  myPurchases(): Observable<CoursePurchase[]> {
    return this.http
      .get<RawCoursePurchaseDoc[] | ApiListResponse<RawCoursePurchaseDoc>>(
        `${this.baseUrl}/purchases/mine`,
      )
      .pipe(map((res) => unwrapList(res).map(normalizeCoursePurchase)));
  }

  mySales(): Observable<CourseSale[]> {
    return this.http
      .get<RawCourseSaleDoc[] | ApiListResponse<RawCourseSaleDoc>>(`${this.baseUrl}/sales/mine`)
      .pipe(map((res) => unwrapList(res).map(normalizeCourseSale)));
  }

  // ---- Categories (superadmin only, gated in the UI) ----

  getCourseCategory(): Observable<CourseCategoryItem[]> {
    return this.http
      .get<RawCourseCategoryDoc[] | ApiListResponse<RawCourseCategoryDoc>>(`${this.baseUrl}/category`)
      .pipe(map((res) => unwrapCategoryList(res).map(normalizeCourseCategory)));
  }

  createCourseCategory(payload: CreateCourseCategoryReqBody): Observable<CourseCategoryItem[]> {
    return this.http
      .post<RawCourseCategoryDoc | RawCourseCategoryDoc[] | ApiListResponse<RawCourseCategoryDoc>>(
        `${this.baseUrl}/category`,
        payload,
      )
      .pipe(map((res) => unwrapCategoryList(res).map(normalizeCourseCategory)));
  }

  updateCategory(id: string, payload: UpdateCourseCategoryReqBody): Observable<CourseCategoryItem[]> {
    return this.http
      .patch<RawCourseCategoryDoc | RawCourseCategoryDoc[] | ApiListResponse<RawCourseCategoryDoc>>(
        `${this.baseUrl}/category/${id}`,
        payload,
      )
      .pipe(map((res) => unwrapCategoryList(res).map(normalizeCourseCategory)));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/category/${id}`);
  }

  // ---- Uploads ----

  uploadImage(formData: FormData): Observable<any> {
    return this.http.post(
      `${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/image/upload`,
      formData,
    );
  }

  uploadRawFile(formData: FormData): Observable<any> {
    return this.http.post(
      `${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/raw/upload`,
      formData,
    );
  }
}