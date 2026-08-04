import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap, timeout } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { KycService } from './kyc.service';
import {
  KYC_DOCUMENT_TYPE_LABELS,
  KYC_DOCUMENT_TYPE_OPTIONS,
  KycDocumentTypeEnum,
  KycRecord,
  KycStatusEnum,
} from './model/kyc.model';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const STATUS_CHECK_TIMEOUT_MS = 10000;

type SlotName = 'front' | 'back' | 'selfie';

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    NgxDropzoneModule,
    MatSelectModule,
    MatOptionModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './kyc.component.html',
  styleUrls: ['./kyc.component.scss'],
})
export class KycComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  readonly documentTypeOptions = KYC_DOCUMENT_TYPE_OPTIONS;
  readonly documentTypeLabels = KYC_DOCUMENT_TYPE_LABELS;
  readonly KycStatusEnum = KycStatusEnum;

  private readonly emptyKycData = {
    documentType: '' as KycDocumentTypeEnum | '',
    documentNumber: '',
    fullName: '',
    dateOfBirth: '',
    address: '',
  };

  kycData = { ...this.emptyKycData };

  frontFiles: File[] = [];
  backFiles: File[] = [];
  selfieFiles: File[] = [];

  statusError = false;
  frontPreviewUrl: string | null = null;
  backPreviewUrl: string | null = null;
  selfiePreviewUrl: string | null = null;

  loading = false;
  statusLoading = true;
  errorMessage = '';
  myStatus: KycRecord | null = null;

  constructor(private kycService: KycService) {}

  ngOnInit(): void {
    this.loadMyStatus();
  }

  ngOnDestroy(): void {
    this.revokePreview('front');
    this.revokePreview('back');
    this.revokePreview('selfie');
  }

  loadMyStatus(): void {
    this.statusLoading = true;
    this.statusError = false;
    this.myStatus = null;

    try {
      this.kycService
        .myKycStatus()
        .pipe(
          timeout(STATUS_CHECK_TIMEOUT_MS),
          catchError((err) => {
            console.error('KYC status check failed:', err);
            this.statusError = err?.status ? err.status !== 404 : true;
            return of(null);
          }),
          finalize(() => {
            this.statusLoading = false;
          }),
        )
        .subscribe((res) => {
          this.myStatus = res;
        });
    } catch (err) {
      this.myStatus = null;
      this.statusLoading = false;
      this.statusError = true;
    }
  }

  get canSubmit(): boolean {
    if (this.statusLoading) return false;
    return !this.myStatus || this.myStatus.status === KycStatusEnum.Rejected;
  }

  get isFormReady(): boolean {
    return (
      !!this.kycData.documentType &&
      !!this.kycData.documentNumber?.trim() &&
      this.frontFiles.length > 0 &&
      this.selfieFiles.length > 0
    );
  }

  private validateSelection(event: any, slot: SlotName): File | null {
    const addedFiles: File[] = event?.addedFiles ?? [];
    if (!addedFiles.length) {
      console.warn(`[KYC] No files in dropzone event for slot "${slot}"`, event);
      return null;
    }

    const file = addedFiles[addedFiles.length - 1];

    // Sanity check — confirms we actually got a real File object, not something else.
    if (!(file instanceof File)) {
      console.error(`[KYC] Selected item for slot "${slot}" is not a File instance:`, file);
      this.errorMessage = `${this.slotLabel(slot)}: could not read the selected file.`;
      return null;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.errorMessage = `${this.slotLabel(slot)}: only JPG, PNG, or WEBP images are allowed.`;
      return null;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.errorMessage = `${this.slotLabel(slot)}: file is too large (max 5MB).`;
      return null;
    }

    this.errorMessage = '';
    return file;
  }

  private slotLabel(slot: SlotName): string {
    switch (slot) {
      case 'front':
        return 'Document front';
      case 'back':
        return 'Document back';
      case 'selfie':
        return 'Selfie';
    }
  }

  private revokePreview(slot: SlotName): void {
    const url =
      slot === 'front' ? this.frontPreviewUrl : slot === 'back' ? this.backPreviewUrl : this.selfiePreviewUrl;
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  onSelectFront(event: any): void {
    const file = this.validateSelection(event, 'front');
    if (!file) return;
    this.revokePreview('front');
    this.frontFiles = [file];
    this.frontPreviewUrl = URL.createObjectURL(file);
    console.log('[KYC] front preview URL:', this.frontPreviewUrl, 'file:', file);
  }
  onRemoveFront(): void {
    this.revokePreview('front');
    this.frontFiles = [];
    this.frontPreviewUrl = null;
  }

  onSelectBack(event: any): void {
    const file = this.validateSelection(event, 'back');
    if (!file) return;
    this.revokePreview('back');
    this.backFiles = [file];
    this.backPreviewUrl = URL.createObjectURL(file);
    console.log('[KYC] back preview URL:', this.backPreviewUrl, 'file:', file);
  }
  onRemoveBack(): void {
    this.revokePreview('back');
    this.backFiles = [];
    this.backPreviewUrl = null;
  }

  onSelectSelfie(event: any): void {
    const file = this.validateSelection(event, 'selfie');
    if (!file) return;
    this.revokePreview('selfie');
    this.selfieFiles = [file];
    this.selfiePreviewUrl = URL.createObjectURL(file);
    console.log('[KYC] selfie preview URL:', this.selfiePreviewUrl, 'file:', file);
  }
  onRemoveSelfie(): void {
    this.revokePreview('selfie');
    this.selfieFiles = [];
    this.selfiePreviewUrl = null;
  }

  /** Fires if the browser fails to actually load the preview image (CSP block, revoked URL, etc). */
  onPreviewImgError(slot: SlotName, event: Event): void {
    const target = event.target as HTMLImageElement;
    console.error(
      `[KYC] Preview image failed to load for slot "${slot}". src was:`,
      target?.src,
      '— check the browser console Network/Console tabs for a CSP "img-src" violation.',
    );
  }

  private uploadFile(file: File, folder: string, slot: SlotName) {
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', 'trizbot');
    uploadData.append('folder', folder);

    return this.kycService.uploadImage(uploadData).pipe(
      catchError((err) => {
        throw { slot, err };
      }),
    );
  }

  private resetForm(): void {
    this.revokePreview('front');
    this.revokePreview('back');
    this.revokePreview('selfie');

    this.kycData = { ...this.emptyKycData };
    this.frontFiles = [];
    this.backFiles = [];
    this.selfieFiles = [];
    this.frontPreviewUrl = null;
    this.backPreviewUrl = null;
    this.selfiePreviewUrl = null;
  }

  onSubmitKyc(): void {
    this.errorMessage = '';

    if (!this.kycData.documentType) {
      this.errorMessage = 'Please select a document type.';
      return;
    }
    if (!this.kycData.documentNumber) {
      this.errorMessage = 'Please enter your document number.';
      return;
    }
    if (!this.frontFiles.length) {
      this.errorMessage = 'Please upload the front of your document.';
      return;
    }
    if (!this.selfieFiles.length) {
      this.errorMessage = 'Please upload a selfie holding your document.';
      return;
    }

    this.loading = true;

    const front$ = this.uploadFile(this.frontFiles[0], 'kyc/documents', 'front');
    const back$ = this.backFiles.length
      ? this.uploadFile(this.backFiles[0], 'kyc/documents', 'back')
      : of(null);
    const selfie$ = this.uploadFile(this.selfieFiles[0], 'kyc/selfies', 'selfie');

    forkJoin({ front: front$, back: back$, selfie: selfie$ })
      .pipe(
        switchMap(({ front, back, selfie }) => {
          const payload = {
            documentType: this.kycData.documentType as KycDocumentTypeEnum,
            documentNumber: this.kycData.documentNumber,
            documentFrontUrl: front.secure_url,
            documentBackUrl: back ? back.secure_url : undefined,
            selfieUrl: selfie.secure_url,
            fullName: this.kycData.fullName || undefined,
            dateOfBirth: this.kycData.dateOfBirth || undefined,
            address: this.kycData.address || undefined,
          };
          return this.kycService.submitKyc(payload);
        }),
      )
      .subscribe({
        next: (res) => {
          this.sharedService.showToast({ title: 'KYC submitted for review.' });
          this.myStatus = res;
          this.loading = false;
          this.resetForm();
        },
        error: (err) => {
          
          if (err?.slot) {
            this.errorMessage = `${this.slotLabel(err.slot)} upload failed. Please try again.`;
          } else {
            this.errorMessage ='Could not submit KYC. Please try again.';
              // err?.error?.message || err?.message || 'Could not submit KYC. Please try again.';
          }
          this.loading = false;
        },
      });
  }
}