import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { UserPaymentMethod, normalizePaymentMethod, CreatePaymentMethodReqBody, UpdatePaymentMethodReqBody } from './payment-method.model';

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodsService {
  private readonly base = `${environment.apiBaseUrl}/p2p/payment-methods`;

  constructor(private http: HttpClient) {}

  myMethods(): Observable<UserPaymentMethod[]> {
    return this.http
      .get<ApiEnvelope<any[]> | any[]>(this.base)
      .pipe(map((res) => this.unwrap(res).map(normalizePaymentMethod)));
  }

  create(payload: CreatePaymentMethodReqBody): Observable<UserPaymentMethod> {
    return this.http
      .post<ApiEnvelope<any> | any>(this.base, payload)
      .pipe(map((res) => normalizePaymentMethod(this.unwrapOne(res))));
  }

  update(id: string, payload: UpdatePaymentMethodReqBody): Observable<UserPaymentMethod> {
    return this.http
      .patch<ApiEnvelope<any> | any>(`${this.base}/${id}`, payload)
      .pipe(map((res) => normalizePaymentMethod(this.unwrapOne(res))));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<any>(`${this.base}/${id}`).pipe(map(() => undefined));
  }

  private unwrap<T>(res: ApiEnvelope<T[]> | T[]): T[] {
    if (Array.isArray(res)) return res;
    return (res as any)?.data ?? [];
  }

  private unwrapOne<T>(res: ApiEnvelope<T> | T): T {
    return (res as ApiEnvelope<T>)?.data !== undefined ? (res as ApiEnvelope<T>).data : (res as T);
  }
}