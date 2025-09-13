import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GetCryptoResBody } from '../../../../app/services/auth.type';



@Injectable({
  providedIn: 'root'
})
export class CashRewardService {


  imageUrl: string = '';
    constructor(private http: HttpClient, private router: Router) {}
   
    
createCashReward(creatorName: string, tradeRewardCashType: string, amount: number, transactionPin: string,  email: string) {
const payload = { creatorName, tradeRewardCashType, amount, transactionPin,  email };
return this.http.put(`${environment.apiBaseUrl}/traders/reward-credit`, payload);
}

resumeTrade(description: string, tradeStatus: string) {
  let status: boolean;

  if (tradeStatus === "open") {
    status = true;
  } else if (tradeStatus === "close") {
    status = false;
  } else {
    status = true;
  }

  const payload = {status,tradeStatus, description };
  return this.http.put(`${environment.apiBaseUrl}/cryptos/resume`, payload);
}

removeTrade(cryptoId: string) {
  return this.http.delete(`${environment.apiBaseUrl}/cryptos/${cryptoId}`);
}


getAvailableCryptos(): Observable<GetCryptoResBody[]> {
  const status= "Available";
  return this.http.get<GetCryptoResBody[]>(`${environment.apiBaseUrl}/cryptos?status=${status}`);
}




}