import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ApiListResponse,
  ApiResponse,
  CreateSignalPayload,
  GetSignalsParams,
  normalizeSignal,
  RawSignal,
  SignalItem,
  SignalListResponse,
  UpdateSignalPayload,
} from './model/signal.model';

@Injectable({
  providedIn: 'root',
})
export class ViewSignalsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/signals`;

  constructor(private http: HttpClient) {}

  getSignals(params: GetSignalsParams): Observable<SignalListResponse> {
    let httpParams = new HttpParams();
    if (params.pair) httpParams = httpParams.set('pair', params.pair);
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);

    return this.http
      .get<ApiListResponse<RawSignal>>(`${this.baseUrl}/admin`, { params: httpParams })
      .pipe(
        map((res) => ({
          items: (res.data ?? []).map(normalizeSignal),
          total: res.meta?.total ?? 0,
          page: res.meta?.page ?? params.page ?? 1,
          limit: res.meta?.limit ?? params.limit ?? 12,
          totalPages: res.meta?.totalPages ?? 1,
        })),
        catchError((err: HttpErrorResponse) => throwError(() => err))
      );
  }

  getSignalById(id: string): Observable<SignalItem> {
    return this.http
      .get<ApiResponse<RawSignal>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => normalizeSignal(res.data)));
  }

  createSignal(payload: CreateSignalPayload): Observable<SignalItem> {
    return this.http
      .post<ApiResponse<RawSignal>>(this.baseUrl, payload)
      .pipe(map((res) => normalizeSignal(res.data)));
  }

  updateSignal(id: string, payload: UpdateSignalPayload): Observable<SignalItem> {
    return this.http
      .patch<ApiResponse<RawSignal>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => normalizeSignal(res.data)));
  }

  deleteSignal(id: string): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.baseUrl}/${id}`);
  }
}