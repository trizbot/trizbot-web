// p2p.service.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

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
  constructor(private http: HttpClient, private router: Router) {}

  // ---------------------------------------------------------------------
  // Market / Orders
  // ---------------------------------------------------------------------

  listOrders(params: ListOrdersParams): Observable<P2POrder[]> {
    let httpParams = new HttpParams();
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.coin) httpParams = httpParams.set('coin', params.coin);
    if (params.fiatCurrency) httpParams = httpParams.set('fiatCurrency', params.fiatCurrency);
    if (params.paymentMethod) httpParams = httpParams.set('paymentMethod', params.paymentMethod);

    return this.http.get<P2POrder[]>(`${environment.apiBaseUrl}/p2p/orders`, {
      params: httpParams,
    });
  }

  myOrders(): Observable<P2POrder[]> {
    return this.http.get<P2POrder[]>(`${environment.apiBaseUrl}/p2p/orders/mine`);
  }

  createOrder(payload: CreateOrderReqBody): Observable<P2POrder> {
    return this.http.post<P2POrder>(`${environment.apiBaseUrl}/p2p/orders`, payload);
  }

  cancelOrder(orderId: string): Observable<P2POrder> {
    return this.http.patch<P2POrder>(`${environment.apiBaseUrl}/p2p/orders/${orderId}/cancel`, {});
  }

  // ---------------------------------------------------------------------
  // Trades
  // ---------------------------------------------------------------------

  myTrades(): Observable<P2PTrade[]> {
    return this.http.get<P2PTrade[]>(`${environment.apiBaseUrl}/p2p/trades/mine`);
  }

  initiateTrade(payload: InitiateTradeReqBody): Observable<P2PTrade> {
    return this.http.post<P2PTrade>(`${environment.apiBaseUrl}/p2p/trades`, payload);
  }

  markPaid(tradeId: string): Observable<P2PTrade> {
    return this.http.patch<P2PTrade>(`${environment.apiBaseUrl}/p2p/trades/${tradeId}/mark-paid`, {});
  }

  releaseTrade(tradeId: string, transactionPin: string): Observable<P2PTrade> {
    return this.http.patch<P2PTrade>(`${environment.apiBaseUrl}/p2p/trades/${tradeId}/release`, {
      transactionPin,
    });
  }

  disputeTrade(tradeId: string, reason: string): Observable<P2PTrade> {
    return this.http.patch<P2PTrade>(`${environment.apiBaseUrl}/p2p/trades/${tradeId}/dispute`, {
      reason,
    });
  }
}