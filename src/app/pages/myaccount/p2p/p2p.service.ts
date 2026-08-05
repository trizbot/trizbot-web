import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateOrderReqBody,
  InitiateTradeReqBody,
  ListOrdersParams,
  P2POrder,
  P2PTrade,
} from './p2p.model';

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

    return this.http.get<P2POrder[]>(`${this.base}/orders`, { params: httpParams });
  }

  myOrders(): Observable<P2POrder[]> {
    return this.http.get<P2POrder[]>(`${this.base}/orders/mine`);
  }

  createOrder(payload: CreateOrderReqBody): Observable<P2POrder> {
    return this.http.post<P2POrder>(`${this.base}/orders`, payload);
  }

  cancelOrder(orderId: string): Observable<P2POrder> {
    return this.http.post<P2POrder>(`${this.base}/orders/cancel`, { id: orderId });
  }

  // ---------------------------------------------------------------------
  // Trades
  // ---------------------------------------------------------------------

  myTrades(): Observable<P2PTrade[]> {
    return this.http.get<P2PTrade[]>(`${this.base}/trades/mine`);
  }

  initiateTrade(payload: InitiateTradeReqBody): Observable<P2PTrade> {
    return this.http.post<P2PTrade>(`${this.base}/trades`, payload);
  }

  markPaid(tradeId: string): Observable<P2PTrade> {
    return this.http.post<P2PTrade>(`${this.base}/trades/mark-paid`, { tradeId });
  }

  releaseTrade(tradeId: string, transactionPin: string): Observable<P2PTrade> {
    return this.http.post<P2PTrade>(`${this.base}/trades/release`, { tradeId, transactionPin });
  }

  disputeTrade(tradeId: string, reason: string): Observable<P2PTrade> {
    return this.http.post<P2PTrade>(`${this.base}/trades/dispute`, { tradeId, reason });
  }
}