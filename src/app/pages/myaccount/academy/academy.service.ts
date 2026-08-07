import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  Course,
  CoursePurchase,
  CourseQueryParams,
  CourseSale,
  CreateCourseReqBody,
  normalizeCourse,
  PurchaseCourseReqBody,
  RawCourseDoc,
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
    return this.http.post<CoursePurchase>(`${this.baseUrl}/purchase`, payload);
  }

  myPurchases(): Observable<CoursePurchase[]> {
    return this.http
      .get<CoursePurchase[] | ApiListResponse<CoursePurchase>>(`${this.baseUrl}/purchases/mine`)
      .pipe(map(unwrapList));
  }

  mySales(): Observable<CourseSale[]> {
    return this.http
      .get<CourseSale[] | ApiListResponse<CourseSale>>(`${this.baseUrl}/sales/mine`)
      .pipe(map(unwrapList));
  }
}