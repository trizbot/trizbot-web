import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  CreateFeedPayload,
  FeedItem,
  FeedListResponse,
  GetFeedParams,
  RawFeedItem,
  RawFeedListResponse,
  UpdateFeedPayload,
  mapRawFeedItem,
} from './model/feed.model';

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

  getFeed(params: GetFeedParams): Observable<FeedListResponse> {
    let httpParams = new HttpParams();
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.coinSymbol) httpParams = httpParams.set('coinSymbol', params.coinSymbol);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<RawFeedListResponse>(this.baseUrl, { params: httpParams }).pipe(
      map((res) => ({
        items: (res?.data ?? []).map(mapRawFeedItem),
        total: res?.meta?.total ?? res?.data?.length ?? 0,
        page: res?.meta?.page ?? params.page ?? 1,
        limit: res?.meta?.limit ?? params.limit ?? 12,
      }))
    );
  }

  getFeedById(id: string): Observable<FeedItem> {
    return this.http
      .get<RawFeedItem | { data: RawFeedItem }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => mapRawFeedItem('data' in res ? res.data : res)));
  }

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

  getTrending(limit?: number): Observable<FeedItem[]> {
    let httpParams = new HttpParams();
    if (limit != null) httpParams = httpParams.set('limit', limit);

    return this.http
      .get<RawFeedItem[] | RawFeedListResponse>(`${this.baseUrl}/trending/list`, {
        params: httpParams,
      })
      .pipe(
        map((res) => {
          const raw: RawFeedItem[] = Array.isArray(res) ? res : res?.data ?? [];
          return raw.map(mapRawFeedItem);
        })
      );
  }

  syncTrending(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/sync-trending`, {});
  }
}