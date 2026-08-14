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
  MySubscription,
  normalizeSignal,
  PlanOption,
  RawSignal,
  SignalItem,
  SignalListResponse,
  SubscribePayload,
  UpdateSignalPayload,
} from './model/signal.model';


export interface SubscribeWithWalletPayload extends SubscribePayload {
  transactionPin: string;
}

export interface WalletBalanceResponse {
  balance: number;
}

@Injectable({
  providedIn: 'root',
})
export class SignalsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/signals`;

  constructor(private http: HttpClient) {}

  // ---- Plans & subscriptions ----

  getPlans(): Observable<PlanOption[]> {
    return this.http
      .get<ApiResponse<PlanOption[]>>(`${this.baseUrl}/plans`)
      .pipe(map((res) => res.data));
  }

  subscribe(payload: SubscribePayload): Observable<MySubscription> {
    return this.http
      .post<ApiResponse<MySubscription>>(`${this.baseUrl}/subscribe`, payload)
      .pipe(map((res) => res.data));
  }

  /** The single "currently active" subscription, if any (kept for compatibility). */
  mySubscription(): Observable<MySubscription | null> {
    return this.http
      .get<ApiResponse<MySubscription | null>>(`${this.baseUrl}/subscription/mine`)
      .pipe(map((res) => res.data));
  }


  getMySubscriptions(): Observable<MySubscription[]> {
    return this.http
      .get<ApiResponse<MySubscription[]>>(`${this.baseUrl}/subscription/mine`)
      .pipe(
        map((res) => res.data ?? []),
        catchError((err: HttpErrorResponse) => {
    
          return throwError(() => err);
        })
      );
  }

  // ---- Wallet ----
  getWalletBalance(): Observable<number> {
    return this.http
      .get<ApiResponse<WalletBalanceResponse>>(`${this.baseUrl}/wallet/balance`)
      .pipe(
        map((res) => res.data?.balance ?? 0),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  subscribeWithWallet(data: SubscribeWithWalletPayload): Observable<MySubscription> {
    let payload={
      plan: data.plan,
      transactionPin: data.transactionPin,
      reference: data.reference|| Math.random().toString(36).substring(2, 15), 
    }
    return this.http
      .post<ApiResponse<MySubscription>>(`${this.baseUrl}/subscribe`, payload)
      .pipe(
        map((res) => res.data),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  // ---- Signals ----


  getSignals(params: GetSignalsParams): Observable<SignalListResponse> {
    let httpParams = new HttpParams();
    if (params.pair) httpParams = httpParams.set('pair', params.pair);
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);

    return this.http
      .get<ApiListResponse<RawSignal>>(this.baseUrl, { params: httpParams })
      .pipe(
        map((res) => ({
          items: (res.data ?? []).map(normalizeSignal),
          total: res.meta?.total ?? 0,
          page: res.meta?.page ?? params.page ?? 1,
          limit: res.meta?.limit ?? params.limit ?? 12,
          totalPages: res.meta?.totalPages ?? 1,
        })),
        catchError((err: HttpErrorResponse) => {
          // console.error('[SignalsService] getSignals failed:', err.status, err.error ?? err.message);
          return throwError(() => err);
        })
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