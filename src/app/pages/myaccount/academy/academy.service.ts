import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  Course,
  CourseCategoryItem,
  CourseFileKind,
  CoursePurchase,
  CourseQueryParams,
  CourseSale,
  CreateCourseCategoryReqBody,
  CreateCourseReqBody,
  isFileSizeAllowed,
  MAX_COURSE_FILE_SIZE_BYTES,
  MAX_COURSE_FILE_SIZE_LABEL,
  MAX_FILE_SIZE_BY_KIND,
  MAX_FILE_SIZE_LABEL_BY_KIND,
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



function unwrapItem<T>(res: T | { data?: T } | { item?: T } | { course?: T }): T {
  if (res && typeof res === 'object') {
    const anyRes = res as any;
    if (anyRes.data && typeof anyRes.data === 'object') return anyRes.data as T;
    if (anyRes.item && typeof anyRes.item === 'object') return anyRes.item as T;
    if (anyRes.course && typeof anyRes.course === 'object') return anyRes.course as T;
  }
  return res as T;
}


function unwrapCategoryList(
  res: RawCourseCategoryDoc | RawCourseCategoryDoc[] | ApiListResponse<RawCourseCategoryDoc>,
): RawCourseCategoryDoc[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'category' in (res as RawCourseCategoryDoc)) {
    return [res as RawCourseCategoryDoc];
  }
  return (
    (res as ApiListResponse<RawCourseCategoryDoc>)?.data ?? (res as ApiListResponse<RawCourseCategoryDoc>)?.items ?? []
  );
}

export interface UpdateCourseCategoryReqBody {
  category?: string;
  reference?: string;
}


function resourceTypeForKind(kind: CourseFileKind): 'image' | 'video' | 'raw' {
  if (kind === 'video' || kind === 'audio') return 'video'; 
  if (kind === 'pdf') return 'image'; 
  if (kind === 'docx') return 'raw';
  return 'raw';
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
    .get<RawCourseDoc | { data: RawCourseDoc }>(`${this.baseUrl}/courses/${id}`)
    .pipe(map((res) => normalizeCourse(unwrapItem(res))));
}

  myCourses(): Observable<Course[]> {
    return this.http
      .get<RawCourseDoc[] | ApiListResponse<RawCourseDoc>>(`${this.baseUrl}/courses/mine`)
      .pipe(map((res) => unwrapList(res).map(normalizeCourse)));
  }

createCourse(payload: CreateCourseReqBody): Observable<Course> {
  return this.http
    .post<RawCourseDoc | { data: RawCourseDoc }>(`${this.baseUrl}/courses`, payload)
    .pipe(map((res) => normalizeCourse(unwrapItem(res))));
}

 updateCourse(id: string, payload: UpdateCourseReqBody): Observable<Course> {
  return this.http
    .patch<RawCourseDoc | { data: RawCourseDoc }>(`${this.baseUrl}/courses/${id}`, payload)
    .pipe(map((res) => normalizeCourse(unwrapItem(res))));
}

  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/courses/${id}`);
  }

  // ---- Purchases ----

purchaseCourse(payload: PurchaseCourseReqBody): Observable<CoursePurchase> {
  return this.http
    .post<RawCoursePurchaseDoc | { data: RawCoursePurchaseDoc }>(`${this.baseUrl}/purchase`, payload)
    .pipe(map((res) => normalizeCoursePurchase(unwrapItem(res))));
}

  myPurchases(): Observable<CoursePurchase[]> {
    return this.http
      .get<RawCoursePurchaseDoc[] | ApiListResponse<RawCoursePurchaseDoc>>(`${this.baseUrl}/purchases/mine`)
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



  uploadImage(formData: FormData, file?: File): Observable<any> {
    if (file && !isFileSizeAllowed(file, 'other')) {
      return throwError(() => new Error(`Image exceeds the maximum allowed size of ${MAX_COURSE_FILE_SIZE_LABEL}.`));
    }
    return this.http.post(`${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/image/upload`, formData);
  }

  /** @deprecated use uploadCourseFile — kept so any existing callers keep compiling */
  uploadRawFile(formData: FormData, file?: File): Observable<any> {
    return this.uploadCourseFile(formData, file, 'pdf');
  }

  uploadCourseFile(formData: FormData, file: File | undefined, kind: CourseFileKind): Observable<any> {
    if (kind === 'other') {
      return throwError(() => new Error('This file type is not supported for course material.'));
    }
    if (file && !isFileSizeAllowed(file, kind)) {
      return throwError(
        () => new Error(`File exceeds the maximum allowed size of ${MAX_FILE_SIZE_LABEL_BY_KIND[kind]}.`),
      );
    }
    const resourceType = resourceTypeForKind(kind);
    return this.http.post(
      `${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/${resourceType}/upload`,
      formData,
    );
  }
}