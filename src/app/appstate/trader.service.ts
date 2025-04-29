import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GetTraderResBody,GetAllTradersResBody,GetDepositResBody,GetWeeklyStatisticsResBody } from '../services/auth.type';


@Injectable({
  providedIn: 'root'
})
export class TraderService {
  constructor(private http: HttpClient) {}


  getTrader(): Observable<GetTraderResBody> {
    const entity=  localStorage.getItem('entity');
    return this.http.get<GetTraderResBody>(`${environment.apiBaseUrl}/${entity}/me`);
  }

  getWeeklyStatistics(): Observable<GetWeeklyStatisticsResBody> {
    const entity=  localStorage.getItem('entity');
    return this.http.get<GetWeeklyStatisticsResBody>(`${environment.apiBaseUrl}/traders/statistics`);
  }


  getAllTraders(): Observable<GetAllTradersResBody[]> {
    return this.http.get<GetAllTradersResBody[]>(`${environment.apiBaseUrl}/traders/all`);
    
  }




  reviewTraders(comment: string,status: string,traderId: string){
    const payload = {comment, status}; 
    return this.http.put(`${environment.apiBaseUrl}/traders/${traderId}/review`, payload);
    }


  creditTraders(amount: string,reason: string, transactionPin:string, traderId: string){
    const payload = {amount, reason,transactionPin}; 
    return this.http.put(`${environment.apiBaseUrl}/traders/${traderId}/credit`, payload);
    }

    setTransaction(transactionPin: string, traderId: string,entity:string){
    const payload = {transactionPin}; 
    return this.http.put(`${environment.apiBaseUrl}/${entity}/${traderId}/set-transaction-pin`, payload);
    }
   
    updateTraders(address: string, phoneNumber:string, entity:string){
    const payload = {address,phoneNumber}; 
    return this.http.put(`${environment.apiBaseUrl}/${entity}/profile`, payload);
    }
  
    walletAddress(walletAddress: string, addressNetwork:string,walletCurrency:string,addressTags:string, entity:string){
    const payload = {walletAddress,addressNetwork,walletCurrency,addressTags}; 
    return this.http.put(`${environment.apiBaseUrl}/${entity}/wallet`, payload);
    }
    
    deposits(amount: any, reference:string,pay_currency:string, note:string, entity:string){
    const payload = {amount,reference,pay_currency,note}; 
    return this.http.post(`${environment.apiBaseUrl}/deposits`, payload);
    }
   


    sendNotification( text:string,title:string, entity:string){
    const payload = {title,text}; 
    return this.http.post(`${environment.apiBaseUrl}/notifications`, payload);
    }


    withdraw(amount: string, reference:string, entityName:string,transactionPin:string,email:string, entity:string){
    const payload = {amount,reference,entityName,transactionPin,email}; 
    return this.http.post(`${environment.apiBaseUrl}/payouts/request`, payload);
    }



    
    
generateImage(formData: FormData): Observable<any> {
return this.http.post(`${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/image/upload`, formData);
}
        
updateAvatar(imageUrl:string,imageSecureUrl: string, imageAssetId:string, imagePublicId:string,entity:string){
const payload = {imageUrl,imagePublicId,imageAssetId,imageSecureUrl}; 
return this.http.put(`${environment.apiBaseUrl}/${entity}/avatar`, payload);
}
      


getPaymentWalletAddress(): Observable<GetDepositResBody[]> {
  return this.http.get<GetDepositResBody[]>(`${environment.apiBaseUrl}/deposits/address`);
}
fundWallet(){
  return this.http.get(`${environment.apiBaseUrl}/deposits/fund`);
}

}
