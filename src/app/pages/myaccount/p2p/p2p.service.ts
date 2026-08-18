import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  CreateOrderReqBody,
  InitiateTradeReqBody,
  ListOrdersParams,
  P2POrder,
  P2PTrade,
  normalizeOrder,
  normalizeTrade,
} from './p2p.model';

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class P2pService {
  private readonly base = `${environment.apiBaseUrl}/p2p`;

  constructor(private http: HttpClient) {}

  // ---------------------------------------------------------------------
  // Market / Orders
  // ---------------------------------------------------------------------

  listOrders(params: ListOrdersParams): Observable<P2POrder[]> {
    let httpParams = new HttpParams();
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.coin) httpParams = httpParams.set('coin', params.coin);
    if (params.fiatCurrency) httpParams = httpParams.set('fiatCurrency', params.fiatCurrency);

    return this.http
      .get<ApiEnvelope<any[]> | any[]>(`${this.base}/orders`, { params: httpParams })
      .pipe(map((res) => this.unwrap(res).map(normalizeOrder)));
  }

  myOrders(): Observable<P2POrder[]> {
    return this.http
      .get<ApiEnvelope<any[]> | any[]>(`${this.base}/orders/mine`)
      .pipe(map((res) => this.unwrap(res).map(normalizeOrder)));
  }

  createOrder(payload: CreateOrderReqBody): Observable<P2POrder> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/orders`, payload)
      .pipe(map((res) => normalizeOrder(this.unwrapOne(res))));
  }

  cancelOrder(orderId: string): Observable<P2POrder> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/orders/cancel`, { id: orderId })
      .pipe(map((res) => normalizeOrder(this.unwrapOne(res))));
  }

  /** Flip an ad between Listed / Hidden without cancelling it (the "Active Mode" switch). */
  setOrderListed(orderId: string, isListed: boolean): Observable<P2POrder> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/orders/visibility`, { id: orderId, isListed })
      .pipe(map((res) => normalizeOrder(this.unwrapOne(res))));
  }

  // ---------------------------------------------------------------------
  // Trades
  // ---------------------------------------------------------------------

  myTrades(): Observable<P2PTrade[]> {
    return this.http
      .get<ApiEnvelope<any[]> | any[]>(`${this.base}/trades/mine`)
      .pipe(map((res) => this.unwrap(res).map(normalizeTrade)));
  }

  initiateTrade(payload: InitiateTradeReqBody): Observable<P2PTrade> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/trades`, payload)
      .pipe(map((res) => normalizeTrade(this.unwrapOne(res))));
  }

  markPaid(tradeId: string): Observable<P2PTrade> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/trades/mark-paid`, { tradeId })
      .pipe(map((res) => normalizeTrade(this.unwrapOne(res))));
  }

  releaseTrade(tradeId: string, transactionPin: string): Observable<P2PTrade> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/trades/release`, { tradeId, transactionPin })
      .pipe(map((res) => normalizeTrade(this.unwrapOne(res))));
  }

  disputeTrade(tradeId: string, reason: string): Observable<P2PTrade> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/trades/dispute`, { tradeId, reason })
      .pipe(map((res) => normalizeTrade(this.unwrapOne(res))));
  }



  private unwrap<T>(res: ApiEnvelope<T[]> | T[]): T[] {
    if (Array.isArray(res)) return res;
    return res?.data ?? [];
  }

  private unwrapOne<T>(res: ApiEnvelope<T> | T): T {
    return (res as ApiEnvelope<T>)?.data !== undefined ? (res as ApiEnvelope<T>).data : (res as T);
  }
}