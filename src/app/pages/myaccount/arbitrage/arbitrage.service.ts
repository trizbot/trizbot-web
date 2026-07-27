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

// --- Shape actually returned by GET /arbitrage/opportunities ---
// This does NOT match ArbitrageOpportunity. It's the raw wire format.
interface RawPricePoint {
  exchange: string;
  price: number;
}

interface RawOpportunity {
  token: string;
  buyExchange: string;
  buyPrice: number;
  sellExchange: string;
  sellPrice: number;
  spread: number;          // raw $ diff for 1 unit, NOT spreadAmount in the model's sense necessarily
  spreadPercent: number;
  prices: RawPricePoint[];
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

// What getOpportunities() actually resolves to: the mapped rows plus
// the meta info the component needs to show data-quality warnings.
export interface OpportunitiesResult {
  opportunities: ArbitrageOpportunity[];
  meta: RawApiMeta;
}

@Injectable({
  providedIn: 'root',
})
export class ArbitrageService {
  constructor(private http: HttpClient, private router: Router) {}

  /**
   * NOTE: the backend response has no `id`, `estimatedProfit`,
   * `spreadAmount`, per-row `updatedAt`, or volume/liquidity fields.
   * Those are synthesized here. `estimatedProfit` in particular is
   * NOT a real profit figure — it's the raw per-unit spread with no
   * fees, slippage, or size applied. Treat it as illustrative only,
   * never as a number to auto-execute trades against.
   */
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
        tap((data) => console.log('[ArbitrageService] getOpportunities response:', data)),
        catchError((err) => {
          console.error('[ArbitrageService] getOpportunities error:', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Same call as getOpportunities(), but also returns `meta` so the
   * component can surface errors (e.g. "Kraken: fetch failed") and
   * caveats (e.g. Coinbase USD vs USDT) instead of silently dropping them.
   */
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
        tap((result) => console.log('[ArbitrageService] getOpportunitiesWithMeta response:', result)),
        catchError((err) => {
          console.error('[ArbitrageService] getOpportunitiesWithMeta error:', err);
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
      // Placeholder only — real profit needs quoteAmount, fees, and slippage.
      estimatedProfit: raw.spread,
      updatedAt,
    };
  }

  placeTrade(payload: PlaceTradeReqBody): Observable<PlaceTradeResBody> {
    return this.http.post<PlaceTradeResBody>(`${environment.apiBaseUrl}/arbitrage/trade`, payload).pipe(
      tap((data) => console.log('[ArbitrageService] placeTrade response:', data)),
      catchError((err) => {
        console.error('[ArbitrageService] placeTrade error:', err);
        return throwError(() => err);
      })
    );
  }
}