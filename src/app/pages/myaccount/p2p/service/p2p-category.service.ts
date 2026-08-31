import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  CreateP2pCategoryPayload,
  P2pCategoryItem,
  UpdateP2pCategoryPayload,
  normalizeP2pCategory,
  unwrapCategoryList,
} from '../model/p2p-category.model';

@Injectable({ providedIn: 'root' })
export class P2pCategoryService {
  private readonly base = `${environment.apiBaseUrl}/p2p/categories`;

  constructor(private http: HttpClient) {}

  getFeedCategory(): Observable<P2pCategoryItem[]> {
    return this.http
      .get<any>(this.base)
      .pipe(map((res) => unwrapCategoryList<any>(res).map(normalizeP2pCategory)));
  }

  /** Just the coin symbols, for the Market/Post-Ad coin pickers. */
  getCategorySymbols(): Observable<string[]> {
    return this.getFeedCategory().pipe(map((items) => items.map((i) => i.category)));
  }

  createFeedCategory(payload: CreateP2pCategoryPayload): Observable<P2pCategoryItem[]> {
    return this.http
      .post<any>(this.base, payload)
      .pipe(map((res) => unwrapCategoryList<any>(res).map(normalizeP2pCategory)));
  }

  updateFeedCategory(id: string, payload: UpdateP2pCategoryPayload): Observable<P2pCategoryItem[]> {
    return this.http
      .patch<any>(`${this.base}/${id}`, payload)
      .pipe(map((res) => unwrapCategoryList<any>(res).map(normalizeP2pCategory)));
  }

  deleteFeedCategory(id: string): Observable<void> {
    return this.http.delete<any>(`${this.base}/${id}`).pipe(map(() => undefined));
  }
}