import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GetCryptoResBody } from '../../../../app/services/auth.type';



@Injectable({
  providedIn: 'root'
})
export class CryptoService {


  imageUrl: string = '';
    constructor(private http: HttpClient, private router: Router) {}
    uploadImage(formData: FormData): Observable<any> {
      return this.http.post(`${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/image/upload`, formData);
      
    }
    


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