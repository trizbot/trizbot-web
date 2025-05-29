

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GetChargeResBody, GetCryptoResBody,PayoutTransactionResBody } from '../../../services/auth.type';



@Injectable({
  providedIn: 'root'
})
export class SettingService {


  imageUrl: string = '';
    constructor(private http: HttpClient, private router: Router) {}
    
createSetting(usdtBscDepositAmount: any,usdtPolygonDepositAmount: any, usdtBscPayoutAmount: any,usdtPolygonPayoutAmount: any,  minimumDepositAmount: any,
            minimumPayoutAmount:any){

    const payload = { usdtBscDepositAmount,usdtPolygonDepositAmount, usdtBscPayoutAmount,usdtPolygonPayoutAmount, minimumDepositAmount,minimumPayoutAmount}; 
return this.http.post(`${environment.apiBaseUrl}/settings`, payload);
}



  getCharges(): Observable<GetChargeResBody> {
    return this.http.get<GetChargeResBody>(`${environment.apiBaseUrl}/settings`);
  }



}