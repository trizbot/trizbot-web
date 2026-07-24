import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateSignalPayload,
  GetSignalsParams,
  MySubscription,
  PlanOption,
  SignalItem,
  SignalListResponse,
  SubscribePayload,
  UpdateSignalPayload,
} from './model/signal.model';

@Injectable({
  providedIn: 'root',
})
export class SignalsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/signals`;

  constructor(private http: HttpClient) {}

  // ---- Plans & subscriptions ----

  getPlans(): Observable<PlanOption[]> {
    return this.http.get<PlanOption[]>(`${this.baseUrl}/plans`);
  }

  subscribe(payload: SubscribePayload): Observable<MySubscription> {
    return this.http.post<MySubscription>(`${this.baseUrl}/subscribe`, payload);
  }

  mySubscription(): Observable<MySubscription | null> {
    return this.http.get<MySubscription | null>(`${this.baseUrl}/subscription/mine`);
  }

  // ---- Signals ----

  getSignals(params: GetSignalsParams): Observable<SignalListResponse> {
    let httpParams = new HttpParams();
    if (params.pair) httpParams = httpParams.set('pair', params.pair);
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<SignalListResponse>(this.baseUrl, { params: httpParams });
  }

  getSignalById(id: string): Observable<SignalItem> {
    return this.http.get<SignalItem>(`${this.baseUrl}/${id}`);
  }

  createSignal(payload: CreateSignalPayload): Observable<SignalItem> {
    return this.http.post<SignalItem>(this.baseUrl, payload);
  }

  updateSignal(id: string, payload: UpdateSignalPayload): Observable<SignalItem> {
    return this.http.patch<SignalItem>(`${this.baseUrl}/${id}`, payload);
  }

  deleteSignal(id: string): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.baseUrl}/${id}`);
  }
}