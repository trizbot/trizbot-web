import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  GetOpportunitiesParams,
  ArbitrageOpportunity,
  PlaceTradeReqBody,
  PlaceTradeResBody,
} from './model/arbitrage.model';
import { MyArbitrageSubscription, ArbitrageSubscriptionPlan } from './model/arbitrage-subscription.model';


interface RawPricePoint {
  exchange: string;
  price: number;
}

interface RawOpportunity {
  token: string;
  buyExchange: string;
  buyPrice: number | null;
  sellExchange: string;
  sellPrice: number | null;
  spread: number | null;
  spreadPercent: number;
  prices: RawPricePoint[];
  locked: boolean;
}

interface RawApiMeta {
  updatedAt: string;
  exchangesTracked: string[];
  refreshIntervalMs: number;
  errors: string[];
  caveats: string[];
}

interface RawApiResponse {
  message: string;
  data: RawOpportunity[];
  meta: RawApiMeta;
}


export interface OpportunitiesResult {
  opportunities: ArbitrageOpportunity[];
  meta: RawApiMeta;
}

@Injectable({
  providedIn: 'root',
})
export class ArbitrageService {
  constructor(private http: HttpClient, private router: Router) {}


  getOpportunities(params: GetOpportunitiesParams): Observable<ArbitrageOpportunity[]> {
    let httpParams = new HttpParams();
    if (params.token) httpParams = httpParams.set('token', params.token);
    if (params.minSpreadPercent != null) {
      httpParams = httpParams.set('minSpreadPercent', String(params.minSpreadPercent));
    }
    if (params.limit != null) httpParams = httpParams.set('limit', String(params.limit));

    return this.http
      .get<RawApiResponse>(`${environment.apiBaseUrl}/arbitrage/opportunities`, {
        params: httpParams,
      })
      .pipe(
        map((res) => this.mapOpportunities(res)),
        tap((data) =>  data),
        catchError((err) => {
          return throwError(() => err);
        })
      );
  }


  getOpportunitiesWithMeta(params: GetOpportunitiesParams): Observable<OpportunitiesResult> {
    let httpParams = new HttpParams();
    if (params.token) httpParams = httpParams.set('token', params.token);
    if (params.minSpreadPercent != null) {
      httpParams = httpParams.set('minSpreadPercent', String(params.minSpreadPercent));
    }
    if (params.limit != null) httpParams = httpParams.set('limit', String(params.limit));

    return this.http
      .get<RawApiResponse>(`${environment.apiBaseUrl}/arbitrage/opportunities`, {
        params: httpParams,
      })
      .pipe(
        map((res) => ({
          opportunities: this.mapOpportunities(res),
          meta: res.meta,
        })),
        tap((result) =>  result),
        catchError((err) => {
          return throwError(() => err);
        })
      );
  }

  private mapOpportunities(res: RawApiResponse): ArbitrageOpportunity[] {
    const updatedAt = res?.meta?.updatedAt ?? new Date().toISOString();

    return (res?.data ?? []).map((raw) => this.mapOpportunity(raw, updatedAt));
  }

  private mapOpportunity(raw: RawOpportunity, updatedAt: string): ArbitrageOpportunity {
  return {
    id: `${raw.token}-${raw.buyExchange}-${raw.sellExchange}-${updatedAt}`,
    token: raw.token,
    buyExchange: raw.buyExchange,
    sellExchange: raw.sellExchange,
    buyPrice: raw.buyPrice,
    sellPrice: raw.sellPrice,
    spreadPercent: raw.spreadPercent,
    spreadAmount: raw.spread,
    estimatedProfit: raw.spread,
    updatedAt,
    locked: raw.locked,
    prices: raw.prices ?? [],
  };
}

  placeTrade(payload: PlaceTradeReqBody): Observable<PlaceTradeResBody> {
    return this.http.post<PlaceTradeResBody>(`${environment.apiBaseUrl}/arbitrage/trade`, payload).pipe(
      tap((data) => data),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }


 getMySubscriptions(): Observable<MyArbitrageSubscription[]> {
    return this.http.get<MyArbitrageSubscription[]>(`${environment.apiBaseUrl}/arbitrage/mysub`);
  }

  subscribe(plan: ArbitrageSubscriptionPlan): Observable<MyArbitrageSubscription> {
    return this.http.post<MyArbitrageSubscription>(`${environment.apiBaseUrl}/arbitrage/subscribe`, { plan });
  }


}