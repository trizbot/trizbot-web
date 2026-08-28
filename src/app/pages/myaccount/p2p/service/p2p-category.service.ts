import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  ApiListResponse,
  CreateFeedCategoryPayload,
  FeedCategoryItem,
  RawFeedCategoryDoc,
  UpdateFeedCategoryPayload,
  normalizeFeedCategory,
  unwrapCategoryList,
} from './model/p2p-category.model';

@Injectable({ providedIn: 'root' })
export class P2pCategoryService {
  private readonly baseUrl = `${environment.apiBaseUrl}/p2p`;

  /** Shared cache so the market filters, the create-ad dialog, and the
   *  admin screen all read the same list instead of each fetching it. */
  private readonly categories$ = new BehaviorSubject<FeedCategoryItem[]>([]);
  readonly categoriesChanges: Observable<FeedCategoryItem[]> = this.categories$.asObservable();

  constructor(private http: HttpClient) {}

  getFeedCategory(): Observable<FeedCategoryItem[]> {
    return this.http
      .get<RawFeedCategoryDoc[] | ApiListResponse<RawFeedCategoryDoc>>(`${this.baseUrl}/category`)
      .pipe(
        map((res) => unwrapCategoryList(res).map(normalizeFeedCategory)),
        tap((list) => this.categories$.next(list))
      );
  }

  /** What the market filters and create-ad dialog actually need: plain symbols. */
  getCategorySymbols(): Observable<string[]> {
    return this.getFeedCategory().pipe(map((list) => list.map((c) => c.category)));
  }

  createFeedCategory(payload: CreateFeedCategoryPayload): Observable<FeedCategoryItem[]> {
    return this.http
      .post<RawFeedCategoryDoc | RawFeedCategoryDoc[] | ApiListResponse<RawFeedCategoryDoc>>(
        `${this.baseUrl}/category`,
        payload
      )
      .pipe(
        map((res) => unwrapCategoryList(res).map(normalizeFeedCategory)),
        tap((list) => this.categories$.next(list))
      );
  }

  updateFeedCategory(id: string, payload: UpdateFeedCategoryPayload): Observable<FeedCategoryItem[]> {
    return this.http
      .patch<RawFeedCategoryDoc | RawFeedCategoryDoc[] | ApiListResponse<RawFeedCategoryDoc>>(
        `${this.baseUrl}/category/${id}`,
        payload
      )
      .pipe(
        map((res) => unwrapCategoryList(res).map(normalizeFeedCategory)),
        tap((list) => this.categories$.next(list))
      );
  }

  deleteFeedCategory(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/category/${id}`)
      .pipe(tap(() => this.categories$.next(this.categories$.value.filter((c) => c.id !== id))));
  }
}