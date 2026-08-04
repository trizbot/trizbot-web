// view-kyc.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { KycRecord, ReviewKycPayload, SubmitKycPayload } from './model/view-kyc.model';

interface ApiResponse<T> {
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class KycService {
  private readonly baseUrl = `${environment.apiBaseUrl}/kyc`;

  constructor(private http: HttpClient) {}

  uploadImage(formData: FormData): Observable<any> {
    return this.http.post(
      `${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/image/upload`,
      formData,
    );
  }

  submitKyc(payload: SubmitKycPayload): Observable<KycRecord> {
    return this.http
      .post<ApiResponse<KycRecord>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  myKycStatus(): Observable<KycRecord | null> {
    return this.http
      .get<ApiResponse<KycRecord | null>>(`${this.baseUrl}/status/mine`)
      .pipe(map((res) => res.data));
  }

  // ---- Admin ----

  listPending(): Observable<KycRecord[]> {
    return this.http
      .get<ApiResponse<KycRecord[]>>(`${this.baseUrl}/pending`)
      .pipe(map((res) => res.data ?? []));
  }

  reviewKyc(id: string, payload: ReviewKycPayload): Observable<KycRecord> {
    return this.http
      .patch<ApiResponse<KycRecord>>(`${this.baseUrl}/${id}/review`, payload)
      .pipe(map((res) => res.data));
  }
}