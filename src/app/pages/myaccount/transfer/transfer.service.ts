import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BeneficiaryLookupResBody, TransferReqBody, TransferResBody } from './transfer.type';

@Injectable({
  providedIn: 'root',
})
export class TransferService {
  constructor(private http: HttpClient, private router: Router) {}

  lookupBeneficiary(identifier: string): Observable<BeneficiaryLookupResBody> {
    return this.http.post<BeneficiaryLookupResBody>(
      `${environment.apiBaseUrl}/transfer/lookup-beneficiary`,
      { identifier }
    );
  }

  transferFunds(payload: TransferReqBody): Observable<TransferResBody> {
    return this.http.post<TransferResBody>(`${environment.apiBaseUrl}/transfer/send`, payload);
  }



  getTransferHistory(): Observable<unknown> {
    return this.http.get<unknown>(`${environment.apiBaseUrl}/transfer/history`);
  }
}