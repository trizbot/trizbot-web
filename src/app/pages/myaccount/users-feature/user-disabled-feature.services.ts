import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GetInvestmentResBody,GetCompletedInvestmentResBody,GetHistoryResBody } from '../../../../app/services/auth.type';



@Injectable({
  providedIn: 'root'
})
export class DisabledService {

constructor(private http: HttpClient, private router: Router) {}


createDisabledFeature(depositDisabled: boolean, walletDisabled: boolean, withdrawalDisabled: boolean, traderId: string){
const payload = {isDepositDisabled:depositDisabled,isWalletDisabled:walletDisabled,isWithdrawalDisabled:withdrawalDisabled}; 
return this.http.put(`${environment.apiBaseUrl}/traders/${traderId}/disable-trader-features`, payload)
}






}