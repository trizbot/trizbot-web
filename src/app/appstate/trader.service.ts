import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  GetTraderResBody,
  GetAllTradersResBody,
  GetAllAdminsResBody,
  GetDepositResBody,
  GetWeeklyStatisticsResBody,
  GetNotificationResBody,
  GetDownlinesResBody,
} from '../services/auth.type';

export interface FlagAccountDto {
  reason: string;
}

export interface BanAccountDto {
  reason: string;
  // durationDays?: number;
}

export interface GetDataParams {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TraderService {
  constructor(private http: HttpClient) {}

  private buildListParams(query: GetDataParams): HttpParams {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    return params;
  }

  disabledUserFeature(data: { traderId: any; result: any }) {
    const payload = {
      isWithdrawalDisabled: data.result.withdrawalDisabled,
      isDepositDisabled: data.result.depositDisabled,
      isWalletDisabled: data.result.walletDisabled,
    };
    return this.http.put(
      `${environment.apiBaseUrl}/traders/${data.traderId}/disable-trader-features`,
      payload
    );
  }

  getTrader(): Observable<GetTraderResBody> {
    const entity = localStorage.getItem('entity');
    return this.http.get<GetTraderResBody>(`${environment.apiBaseUrl}/${entity}/me`);
  }

  getTraderById(traderId: string): Observable<GetTraderResBody> {
    const payload = { traderId };
    const entity = localStorage.getItem('entity');
    return this.http.post<GetTraderResBody>(
      `${environment.apiBaseUrl}/${entity}/disable-users`,
      payload
    );
  }

  getDownlines(traderId: string): Observable<GetDownlinesResBody> {
    const entity = localStorage.getItem('entity');
    const payload = { traderId };
    return this.http.put<GetDownlinesResBody>(
      `${environment.apiBaseUrl}/${entity}/${traderId}/referrals`,
      payload
    );
  }

  getNotification(): Observable<GetNotificationResBody[]> {
    return this.http.get<GetNotificationResBody[]>(`${environment.apiBaseUrl}/notifications/unread`);
  }

  countNotification() {
    return this.http.get(`${environment.apiBaseUrl}/notifications/count`);
  }

  readNotification(notificationId: any) {
    const payload = { notificationId };
    return this.http.post(`${environment.apiBaseUrl}/notifications/read`, payload);
  }

  getWeeklyStatistics(): Observable<GetWeeklyStatisticsResBody> {
    const entity = localStorage.getItem('entity');
    return this.http.get<GetWeeklyStatisticsResBody>(`${environment.apiBaseUrl}/traders/statistics`);
  }

  // NOTE: previously ignored the page/limit args entirely — fixed to actually
  // send them so server-side pagination in the users table works.
  getAllTraders(query: GetDataParams): Observable<GetAllTradersResBody[]> {
    return this.http.get<GetAllTradersResBody[]>(`${environment.apiBaseUrl}/traders/all`, {
      params: this.buildListParams(query),
    });
  }

  getAllAdmins(): Observable<GetAllAdminsResBody[]> {
    return this.http.get<GetAllAdminsResBody[]>(`${environment.apiBaseUrl}/admins/all`);
  }

  removeAdmin(id: any): Observable<any> {
    const url = `${environment.apiBaseUrl}/admins/${id}`;
    return this.http.delete(url);
  }

  reviewTraders(comment: string, status: string, traderId: string) {
    const payload = { comment, status };
    return this.http.put(`${environment.apiBaseUrl}/traders/${traderId}/review`, payload);
  }

  creditTraders(amount: any, transactionPin: any, reason: string, traderId: string) {
    const payload = { amount, transactionPin, reason };
    return this.http.put(`${environment.apiBaseUrl}/traders/${traderId}/credit`, payload);
  }

  setTransaction(transactionPin: any, traderId: string, entity: string) {
    const payload = { transactionPin };
    return this.http.put(
      `${environment.apiBaseUrl}/${entity}/${traderId}/set-transaction-pin`,
      payload
    );
  }

  updateTraders(address: string, phoneNumber: string, entity: string) {
    const payload = { address, phoneNumber };
    return this.http.put(`${environment.apiBaseUrl}/${entity}/profile`, payload);
  }

  walletAddress(
    walletAddress: string,
    addressNetwork: string,
    walletCurrency: string,
    addressTags: string,
    entity: string
  ) {
    const payload = { walletAddress, addressNetwork, walletCurrency, addressTags };
    return this.http.put(`${environment.apiBaseUrl}/${entity}/wallet`, payload);
  }

  deposits(amount: any, reference: string, pay_currency: string, note: string, entity: string) {
    const payload = { amount, reference, pay_currency, note };
    return this.http.post(`${environment.apiBaseUrl}/deposits`, payload);
  }

  sendNotification(text: string, title: string, entity: string) {
    const payload = { title, text };
    return this.http.post(`${environment.apiBaseUrl}/notifications`, payload);
  }

  withdraw(
    amount: string,
    reference: string,
    entityName: string,
    transactionPin: string,
    email: string,
    entity: string
  ) {
    const payload = { amount, reference, entityName, transactionPin, email };
    return this.http.post(`${environment.apiBaseUrl}/payouts/request`, payload);
  }

  generateImage(formData: FormData): Observable<any> {
    const response = this.http.post(
      `${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/image/upload`,
      formData
    );
    return response;
  }

  updateAvatar(
    imageUrl: string,
    imageSecureUrl: string,
    imageAssetId: string,
    imagePublicId: string,
    entity: string
  ) {
    const payload = { imageUrl, imagePublicId, imageAssetId, imageSecureUrl };
    return this.http.put(`${environment.apiBaseUrl}/${entity}/avatar`, payload);
  }

  getPaymentWalletAddress(): Observable<GetDepositResBody[]> {
    return this.http.get<GetDepositResBody[]>(`${environment.apiBaseUrl}/deposits/address`);
  }

  fundWallet() {
    return this.http.get(`${environment.apiBaseUrl}/deposits/fund`);
  }

  resetDepositDailyAndWeekly() {
    return this.http.get(`${environment.apiBaseUrl}/transactions/reset`);
  }

  // ---------------------------------------------------------------------
  // Admin account moderation — flagged / banned accounts
  // Mirrors: GET/PATCH .../traders/admin/accounts/...
  // ---------------------------------------------------------------------

  listFlaggedAccounts(query: GetDataParams): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/traders/admin/accounts/flagged`, {
      params: this.buildListParams(query),
    });
  }

  listBannedAccounts(query: GetDataParams): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/traders/admin/accounts/banned`, {
      params: this.buildListParams(query),
    });
  }

  flagAccount(traderId: string, body: FlagAccountDto): Observable<any> {
    return this.http.patch(
      `${environment.apiBaseUrl}/traders/admin/accounts/${traderId}/flag`,
      body
    );
  }

  unflagAccount(traderId: string): Observable<any> {
    return this.http.patch(
      `${environment.apiBaseUrl}/traders/admin/accounts/${traderId}/unflag`,
      {}
    );
  }

banAccount(traderId: string, body: BanAccountDto): Observable<any> {
    return this.http.patch(
      `${environment.apiBaseUrl}/traders/admin/accounts/${traderId}/ban`,
      body
    );
  }

  restoreAccount(traderId: string): Observable<any> {
    return this.http.patch(
      `${environment.apiBaseUrl}/traders/admin/accounts/${traderId}/restore`,
      {}
    );
  }
}