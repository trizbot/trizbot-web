

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Course,
  CoursePurchase,
  CourseQueryParams,
  CourseSale,
  CreateCourseReqBody,
  PurchaseCourseReqBody,
  UpdateCourseReqBody,
} from './model/academy.model';

@Injectable({
  providedIn: 'root',
})
export class AcademyService {
  constructor(private http: HttpClient, private router: Router) {}

  // ---- Courses ----

  getCourses(params: CourseQueryParams): Observable<Course[]> {
    let httpParams = new HttpParams();
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.level) httpParams = httpParams.set('level', params.level);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<Course[]>(`${environment.apiBaseUrl}/academy/courses`, {
      params: httpParams,
    });
  }

  getCourseById(id: string): Observable<Course> {
    return this.http.get<Course>(`${environment.apiBaseUrl}/academy/courses/${id}`);
  }

  myCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${environment.apiBaseUrl}/academy/courses/mine`);
  }

  createCourse(payload: CreateCourseReqBody): Observable<Course> {
    return this.http.post<Course>(`${environment.apiBaseUrl}/academy/courses`, payload);
  }

  updateCourse(id: string, payload: UpdateCourseReqBody): Observable<Course> {
    return this.http.patch<Course>(`${environment.apiBaseUrl}/academy/courses/${id}`, payload);
  }

  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/academy/courses/${id}`);
  }

  // ---- Purchases ----

  purchaseCourse(payload: PurchaseCourseReqBody): Observable<CoursePurchase> {
    return this.http.post<CoursePurchase>(`${environment.apiBaseUrl}/academy/purchase`, payload);
  }

  myPurchases(): Observable<CoursePurchase[]> {
    return this.http.get<CoursePurchase[]>(`${environment.apiBaseUrl}/academy/purchases/mine`);
  }

  mySales(): Observable<CourseSale[]> {
    return this.http.get<CourseSale[]>(`${environment.apiBaseUrl}/academy/sales/mine`);
  }
}