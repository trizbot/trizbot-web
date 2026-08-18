import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  CreateFeedCategoryPayload,
  CreateFeedPayload,
  FeedCategoryItem,
  FeedItem,
  FeedListResponse,
  GetFeedParams,
  RawFeedCategoryDoc,
  RawFeedItem,
  RawFeedListResponse,
  UpdateFeedCategoryPayload,
  UpdateFeedPayload,
  mapRawFeedItem,
  normalizeFeedCategory,
} from './model/feed.model';

interface ApiListResponse<T> {
  data?: T[];
  items?: T[];
}

/**
 * Feed category endpoints can come back as a bare array, a single object
 * (e.g. right after a create/update of one record), or wrapped in
 * `{ data: [...] }` / `{ items: [...] }` depending on the route — this
 * normalizes all of those into a flat array, same approach as
 * `AcademyService`'s `unwrapCategoryList`.
 */
function unwrapCategoryList(
  res: RawFeedCategoryDoc | RawFeedCategoryDoc[] | ApiListResponse<RawFeedCategoryDoc>,
): RawFeedCategoryDoc[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'category' in (res as RawFeedCategoryDoc)) {
    return [res as RawFeedCategoryDoc];
  }
  return (
    (res as ApiListResponse<RawFeedCategoryDoc>)?.data ??
    (res as ApiListResponse<RawFeedCategoryDoc>)?.items ??
    []
  );
}

@Injectable({
  providedIn: 'root',
})
export class FeedService {
  private readonly baseUrl = `${environment.apiBaseUrl}/feed`;

  constructor(private http: HttpClient) {}

  uploadImage(formData: FormData): Observable<any> {
    return this.http.post(
      `${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/image/upload`,
      formData,
    );
  }

  /**
   * Builds the query params for the feed list endpoint.
   * Every param is optional — only non-empty values are attached, so an
   * empty-string category (the "All" selection) correctly clears the filter
   * instead of being sent as `category=`.
   */
  private buildFeedParams(params: GetFeedParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.category && String(params.category).trim().length > 0) {
      httpParams = httpParams.set('category', params.category);
    }
    if (params.coinSymbol && params.coinSymbol.trim().length > 0) {
      httpParams = httpParams.set('coinSymbol', params.coinSymbol.trim());
    }
    if (params.search && params.search.trim().length > 0) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.page != null) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params.limit != null) {
      httpParams = httpParams.set('limit', params.limit);
    }

    return httpParams;
  }

  getFeed(params: GetFeedParams): Observable<FeedListResponse> {
    const httpParams = this.buildFeedParams(params);

    return this.http.get<RawFeedListResponse>(this.baseUrl, { params: httpParams }).pipe(
      map((res) => ({
        items: (res?.data ?? []).map(mapRawFeedItem),
        total: res?.meta?.total ?? res?.data?.length ?? 0,
        page: res?.meta?.page ?? params.page ?? 1,
        limit: res?.meta?.limit ?? params.limit ?? 12,
      })),
    );
  }

  getFeedById(id: string): Observable<FeedItem> {
    return this.http
      .get<RawFeedItem | { data: RawFeedItem }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => mapRawFeedItem('data' in res ? res.data : res)));
  }

  /**
   * Creates a feed post. `reference` is never part of `CreateFeedPayload` —
   * the backend is responsible for generating it and returns it on the
   * created record, which `mapRawFeedItem` picks up automatically.
   */
  createFeed(payload: CreateFeedPayload): Observable<FeedItem> {
    return this.http
      .post<RawFeedItem | { data: RawFeedItem }>(this.baseUrl, payload)
      .pipe(map((res) => mapRawFeedItem('data' in res ? res.data : res)));
  }

  updateFeed(id: string, payload: UpdateFeedPayload): Observable<FeedItem> {
    return this.http
      .patch<RawFeedItem | { data: RawFeedItem }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => mapRawFeedItem('data' in res ? res.data : res)));
  }

  deleteFeed(id: string): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.baseUrl}/${id}`);
  }

  // ── Feed Categories (list is public; create / update / delete are
  // gated to super-admins in the UI, mirroring AcademyService's
  // course-category endpoints). ──────────────────────────────────

  getFeedCategory(): Observable<FeedCategoryItem[]> {
    return this.http
      .get<RawFeedCategoryDoc[] | ApiListResponse<RawFeedCategoryDoc>>(`${this.baseUrl}/category`)
      .pipe(map((res) => unwrapCategoryList(res).map(normalizeFeedCategory)));
  }

  createFeedCategory(payload: CreateFeedCategoryPayload): Observable<FeedCategoryItem[]> {
    return this.http
      .post<RawFeedCategoryDoc | RawFeedCategoryDoc[] | ApiListResponse<RawFeedCategoryDoc>>(
        `${this.baseUrl}/category`,
        payload,
      )
      .pipe(map((res) => unwrapCategoryList(res).map(normalizeFeedCategory)));
  }

  updateFeedCategory(id: string, payload: UpdateFeedCategoryPayload): Observable<FeedCategoryItem[]> {
    return this.http
      .patch<RawFeedCategoryDoc | RawFeedCategoryDoc[] | ApiListResponse<RawFeedCategoryDoc>>(
        `${this.baseUrl}/category/${id}`,
        payload,
      )
      .pipe(map((res) => unwrapCategoryList(res).map(normalizeFeedCategory)));
  }

  deleteFeedCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/category/${id}`);
  }
}