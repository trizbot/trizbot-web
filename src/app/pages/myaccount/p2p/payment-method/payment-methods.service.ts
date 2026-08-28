import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  RawUserPaymentMethod,
  SavePaymentMethodPayload,
  UserPaymentMethod,
  normalizePaymentMethod,
} from './payment-method.model';

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodsService {
  private readonly base = `${environment.apiBaseUrl}/p2p/payment-methods`;

  private readonly methods$ = new BehaviorSubject<UserPaymentMethod[]>([]);
  readonly methodsChanges: Observable<UserPaymentMethod[]> = this.methods$.asObservable();

  constructor(private http: HttpClient) {}

  myMethods(): Observable<UserPaymentMethod[]> {
    return this.http
      .get<ApiEnvelope<RawUserPaymentMethod[]> | RawUserPaymentMethod[]>(this.base)
      .pipe(
        map((res) => this.unwrap(res).map(normalizePaymentMethod)),
        tap((list) => this.methods$.next(list))
      );
  }

  add(payload: SavePaymentMethodPayload): Observable<UserPaymentMethod> {
    return this.http
      .post<ApiEnvelope<RawUserPaymentMethod> | RawUserPaymentMethod>(this.base, payload)
      .pipe(
        map((res) => normalizePaymentMethod(this.unwrapOne(res))),
        tap((added) => this.methods$.next([...this.methods$.value, added]))
      );
  }

  update(id: string, payload: Partial<SavePaymentMethodPayload>): Observable<UserPaymentMethod> {
    return this.http
      .patch<ApiEnvelope<RawUserPaymentMethod> | RawUserPaymentMethod>(`${this.base}/${id}`, payload)
      .pipe(
        map((res) => normalizePaymentMethod(this.unwrapOne(res))),
        tap((updated) => this.methods$.next(this.methods$.value.map((m) => (m.id === id ? updated : m))))
      );
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${id}`)
      .pipe(tap(() => this.methods$.next(this.methods$.value.filter((m) => m.id !== id))));
  }

  private unwrap<T>(res: ApiEnvelope<T[]> | T[]): T[] {
    if (Array.isArray(res)) return res;
    return (res as ApiEnvelope<T[]>)?.data ?? [];
  }

  private unwrapOne<T>(res: ApiEnvelope<T> | T): T {
    return (res as ApiEnvelope<T>)?.data !== undefined ? (res as ApiEnvelope<T>).data : (res as T);
  }
}