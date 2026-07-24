import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateFeedPayload,
  FeedItem,
  FeedListResponse,
  GetFeedParams,
  UpdateFeedPayload,
} from './model/feed.model';

@Injectable({
  providedIn: 'root',
})
export class FeedService {
  private readonly baseUrl = `${environment.apiBaseUrl}/feed`;

  constructor(private http: HttpClient) {}

  getFeed(params: GetFeedParams): Observable<FeedListResponse> {
    let httpParams = new HttpParams();
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.coinSymbol) httpParams = httpParams.set('coinSymbol', params.coinSymbol);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<FeedListResponse>(this.baseUrl, { params: httpParams });
  }

  getFeedById(id: string): Observable<FeedItem> {
    return this.http.get<FeedItem>(`${this.baseUrl}/${id}`);
  }

  createFeed(payload: CreateFeedPayload): Observable<FeedItem> {
    return this.http.post<FeedItem>(this.baseUrl, payload);
  }

  updateFeed(id: string, payload: UpdateFeedPayload): Observable<FeedItem> {
    return this.http.patch<FeedItem>(`${this.baseUrl}/${id}`, payload);
  }

  deleteFeed(id: string): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.baseUrl}/${id}`);
  }

  getTrending(limit?: number): Observable<FeedItem[]> {
    let httpParams = new HttpParams();
    if (limit != null) httpParams = httpParams.set('limit', limit);
    return this.http.get<FeedItem[]>(`${this.baseUrl}/trending/list`, { params: httpParams });
  }

  syncTrending(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/sync-trending`, {});
  }
}