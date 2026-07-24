import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GetOpportunitiesParams, ArbitrageOpportunity, PlaceTradeReqBody, PlaceTradeResBody } from './model/arbitrage.model';


@Injectable({
  providedIn: 'root',
})
export class ArbitrageService {
  constructor(private http: HttpClient, private router: Router) {}

  getOpportunities(params: GetOpportunitiesParams): Observable<ArbitrageOpportunity[]> {
    let httpParams = new HttpParams();
    if (params.token) httpParams = httpParams.set('token', params.token);
    if (params.minSpreadPercent != null) {
      httpParams = httpParams.set('minSpreadPercent', params.minSpreadPercent);
    }
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<ArbitrageOpportunity[]>(`${environment.apiBaseUrl}/arbitrage/opportunities`, {
      params: httpParams,
    });
  }

  placeTrade(payload: PlaceTradeReqBody): Observable<PlaceTradeResBody> {
    return this.http.post<PlaceTradeResBody>(`${environment.apiBaseUrl}/arbitrage/trade`, payload);
  }
}