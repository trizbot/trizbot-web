import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BeneficiaryLookupResBody, TransferReqBody, TransferResBody } from './transfer.type';

interface ApiEnvelope<T> {
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root',
})
export class TransferService {
  constructor(private http: HttpClient, private router: Router) {}

  lookupBeneficiary(identifier: string): Observable<BeneficiaryLookupResBody> {
    return this.http
      .post<ApiEnvelope<BeneficiaryLookupResBody> | BeneficiaryLookupResBody>(
        `${environment.apiBaseUrl}/transfer/lookup-beneficiary`,
        { identifier }
      )
      .pipe(map((res) => this.unwrap<BeneficiaryLookupResBody>(res)));
  }

  transferFunds(payload: TransferReqBody): Observable<TransferResBody> {
    return this.http
      .post<ApiEnvelope<TransferResBody> | TransferResBody>(
        `${environment.apiBaseUrl}/transfer/send`,
        payload
      )
      .pipe(map((res) => this.unwrap<TransferResBody>(res)));
  }

  getTransferHistory(): Observable<unknown> {
    return this.http.get<unknown>(`${environment.apiBaseUrl}/transfer/history`);
  }

 
  private unwrap<T>(res: ApiEnvelope<T> | T): T {
    if (res && typeof res === 'object' && 'data' in (res as ApiEnvelope<T>)) {
      return (res as ApiEnvelope<T>).data as T;
    }
    return res as T;
  }
}