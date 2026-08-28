import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  CreateOrderReqBody,
  ExchangeRateRes,
  InitiateTradeReqBody,
  ListOrdersParams,
  MarkTradePaidReqBody,
  P2POrder,
  P2PTrade,
  ReleaseTradeReqBody,
  UpdateOrderReqBody,
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

  /** Edit an existing ad (price, amounts, limits, payment methods/details, terms, window). */
  updateOrder(orderId: string, payload: UpdateOrderReqBody): Observable<P2POrder> {
    return this.http
      .patch<ApiEnvelope<any> | any>(`${this.base}/orders/${orderId}`, payload)
      .pipe(map((res) => normalizeOrder(this.unwrapOne(res))));
  }

deleteOrder(orderId: string): Observable<void> {
  return this.http
    .delete<ApiEnvelope<any> | any>(`${this.base}/orders/${orderId}`)
    .pipe(
      map((res) => {
        const body = (res as any)?.data ?? res;
        const failed =
          body && typeof body === 'object' &&
          ((body.deletedCount === 0) || (body.success === false));
        if (failed) {
          throw new Error('Delete did not remove the ad.');
        }
        return undefined;
      })
    );
}


  cancelOrder(orderId: string): Observable<P2POrder> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/orders/cancel`, { id: orderId })
      .pipe(map((res) => normalizeOrder(this.unwrapOne(res))));
  }

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

  getTrade(id: string): Observable<P2PTrade> {
    return this.http
      .get<ApiEnvelope<any> | any>(`${this.base}/trades/${id}`)
      .pipe(map((res) => normalizeTrade(this.unwrapOne(res))));
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

  // releaseTrade(tradeId: string, transactionPin: string): Observable<P2PTrade> {
  //   return this.http
  //     .post<ApiEnvelope<any> | any>(`${this.base}/trades/release`, { tradeId, transactionPin })
  //     .pipe(map((res) => normalizeTrade(this.unwrapOne(res))));
  // }

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




/** Server-computed unseen-trade count for the "My Trades" badge. */
getTradesNotificationCount(): Observable<{ count: number }> {
  return this.http
    .get<ApiEnvelope<{ count: number }> | { count: number }>(`${this.base}/trades/notifications/count`)
    .pipe(map((res) => this.unwrapOne(res)));
}

/** Call when the user opens "My Trades" to clear the badge server-side. */
markTradesSeen(): Observable<{ count: number }> {
  return this.http
    .post<ApiEnvelope<{ count: number }> | { count: number }>(`${this.base}/trades/notifications/seen`, {})
    .pipe(map((res) => this.unwrapOne(res)));
}



  getExchangeRate(coin: string, fiatCurrency: string): Observable<ExchangeRateRes> {
    const params = new HttpParams().set('coin', coin).set('fiatCurrency', fiatCurrency);
    return this.http
      .get<ApiEnvelope<ExchangeRateRes> | ExchangeRateRes>(`${this.base}/exchange-rate`, { params })
      .pipe(map((res) => this.unwrapOne(res)));
  }
  markTradePaid(tradeId: string, body: MarkTradePaidReqBody): Observable<P2PTrade> {
  return this.http
    .post<any>(`${this.base}/trades/${tradeId}/mark-paid`, body)
    .pipe(map((res) => normalizeTrade(res.data ?? res)));
}

releaseTrade(tradeId: string, body: ReleaseTradeReqBody = {}): Observable<P2PTrade> {
  return this.http
    .post<any>(`${this.base}/trades/${tradeId}/release`, body)
    .pipe(map((res) => normalizeTrade(res.data ?? res)));
}

}