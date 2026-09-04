import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  AdminPaymentMethod,
  CreateAdminPaymentMethodReqBody,
  UpdateAdminPaymentMethodReqBody,
  normalizeAdminPaymentMethod,
  PAYMENT_METHODS_BY_FIAT,
} from '../model/p2p.model';

interface ApiEnvelope<T> {
  message: string;
  data: T;
}


@Injectable({ providedIn: 'root' })
export class P2pPaymentMethodAdminService {
  private readonly base = `${environment.apiBaseUrl}/p2p/admin/payment-methods`;

  private readonly methodsSubject = new BehaviorSubject<AdminPaymentMethod[]>([]);
  readonly methods$ = this.methodsSubject.asObservable();

  constructor(private http: HttpClient) {}

  get snapshot(): AdminPaymentMethod[] {
    return this.methodsSubject.value;
  }

  /** Static fallback list merged with whatever admin has added, grouped by fiat. */
  methodsByFiat(): Record<string, string[]> {
    const merged: Record<string, string[]> = {};
    for (const fiat of Object.keys(PAYMENT_METHODS_BY_FIAT)) {
      merged[fiat] = [...PAYMENT_METHODS_BY_FIAT[fiat]];
    }
    for (const m of this.methodsSubject.value) {
      if (!m.isActive) continue;
      const key = m.fiatCurrency.toUpperCase();
      if (!merged[key]) merged[key] = [];
      if (!merged[key].includes(m.name)) merged[key].push(m.name);
    }
    return merged;
  }

  methodsForFiat(fiat: string | null | undefined): string[] {
    const key = (fiat || 'NGN').toUpperCase();
    const byFiat = this.methodsByFiat();
    return byFiat[key] || byFiat['NGN'] || [];
  }

  refresh(): Observable<AdminPaymentMethod[]> {
    return this.http.get<ApiEnvelope<any[]> | any[]>(this.base).pipe(
      map((res) => this.unwrap(res).map(normalizeAdminPaymentMethod)),
      tap((methods) => this.methodsSubject.next(methods))
    );
  }

  create(payload: CreateAdminPaymentMethodReqBody): Observable<AdminPaymentMethod> {
    return this.http.post<ApiEnvelope<any> | any>(this.base, payload).pipe(
      map((res) => normalizeAdminPaymentMethod(this.unwrapOne(res))),
      tap((created) => this.methodsSubject.next([...this.methodsSubject.value, created]))
    );
  }

  update(id: string, payload: UpdateAdminPaymentMethodReqBody): Observable<AdminPaymentMethod> {
    return this.http.patch<ApiEnvelope<any> | any>(`${this.base}/${id}`, payload).pipe(
      map((res) => normalizeAdminPaymentMethod(this.unwrapOne(res))),
      tap((updated) =>
        this.methodsSubject.next(
          this.methodsSubject.value.map((m) => (m.id === updated.id ? updated : m))
        )
      )
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiEnvelope<any> | any>(`${this.base}/${id}`).pipe(
      map(() => undefined),
      tap(() => this.methodsSubject.next(this.methodsSubject.value.filter((m) => m.id !== id)))
    );
  }

  private unwrap<T>(res: ApiEnvelope<T[]> | T[]): T[] {
    if (Array.isArray(res)) return res;
    return (res as any)?.data ?? [];
  }

  private unwrapOne<T>(res: ApiEnvelope<T> | T): T {
    return (res as ApiEnvelope<T>)?.data !== undefined ? (res as ApiEnvelope<T>).data : (res as T);
  }
}