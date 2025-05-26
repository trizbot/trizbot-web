

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GetCryptoResBody,PayoutTransactionResBody } from '../../../services/auth.type';



@Injectable({
  providedIn: 'root'
})
export class SettingService {


  imageUrl: string = '';
    constructor(private http: HttpClient, private router: Router) {}
    
createSetting(usdtBscDepositAmount: string,usdtPolygonDepositAmount: string, usdtBscPayoutAmount: string,usdtPolygonPayoutAmount: string){

    const payload = { usdtBscDepositAmount,usdtPolygonDepositAmount, usdtBscPayoutAmount,usdtPolygonPayoutAmount}; 
return this.http.post(`${environment.apiBaseUrl}/settings`, payload);
}





}