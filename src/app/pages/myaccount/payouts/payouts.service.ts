import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GetCryptoResBody,PayoutTransactionResBody } from '../../../../app/services/auth.type';



@Injectable({
  providedIn: 'root'
})
export class PayoutService {


  imageUrl: string = '';
    constructor(private http: HttpClient, private router: Router) {}
    
    

createCrypto(creatorName: string,title: string,maxAmount: any, minAmount:any,imageUrl:any, imageSecureUrl:any, imageAssetId:any, imagePublicId:any, percentage:any,expiry:any,sellExchange:string,buyExchange:string){
const profit  = percentage/100 * minAmount;

const payload = { creatorName, title,maxAmount, minAmount, imageUrl, imageSecureUrl,imageAssetId,imagePublicId, profit,percentage,expiry,sellExchange,buyExchange}; 
return this.http.post(`${environment.apiBaseUrl}/cryptos`, payload);
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
  return this.http.put(`${environment.apiBaseUrl}/payouts/resume`, payload);
}

removeTrade(cryptoId: string) {
  return this.http.delete(`${environment.apiBaseUrl}/payouts/${cryptoId}`);
}


getPayoutTransactions(): Observable<PayoutTransactionResBody[]> {
  return this.http.get<PayoutTransactionResBody[]>(`${environment.apiBaseUrl}/payouts`);
}




}