import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { KycRecord, ReviewKycPayload, SubmitKycPayload } from './model/kyc.model';

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
    return this.http.post<KycRecord>(this.baseUrl, payload);
  }

  myKycStatus(): Observable<KycRecord | null> {
    return this.http.get<KycRecord | null>(`${this.baseUrl}/status/mine`);
  }

  // ---- Admin ----

  listPending(): Observable<KycRecord[]> {
    return this.http.get<KycRecord[]>(`${this.baseUrl}/pending`);
  }

  reviewKyc(id: string, payload: ReviewKycPayload): Observable<KycRecord> {
    return this.http.patch<KycRecord>(`${this.baseUrl}/${id}/review`, payload);
  }
}