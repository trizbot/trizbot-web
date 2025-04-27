import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GetInvestmentResBody,GetCompletedInvestmentResBody,GetHistoryResBody } from '../../../../app/services/auth.type';



@Injectable({
  providedIn: 'root'
})
export class InvestmentService {

constructor(private http: HttpClient, private router: Router) {}
createInvestment(reference:string, description: string,transactionType: string,amount: any, cryptoId: string){
const payload = {reference, description, transactionType,amount, cryptoId}; 
return this.http.post(`${environment.apiBaseUrl}/transactions`, payload);
}


getInvestments(): Observable<GetInvestmentResBody[]> {
  return this.http.get<GetInvestmentResBody[]>(`${environment.apiBaseUrl}/transactions?pageNumber=1&pageSize=10&transactionType=Debit&transactionStatus=Pending`);
}

getCompletedInvestments(): Observable<GetCompletedInvestmentResBody[]> {
  return this.http.get<GetCompletedInvestmentResBody[]>(`${environment.apiBaseUrl}/transactions?pageNumber=1&pageSize=15&transactionType=Debit&transactionStatus=Completed`);
}

getInvestmentHistory(): Observable<GetHistoryResBody[]> {
  return this.http.get<GetHistoryResBody[]>(`${environment.apiBaseUrl}/transactions/history`);
}




}