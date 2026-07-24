import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';

import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, NgxDropzoneModule],
  templateUrl: './kyc.component.html',
  styleUrls: ['./kyc.component.scss'],
})
export class KycComponent implements OnInit {
  private sharedService = inject(SharedService);
  readonly documentTypeOptions = KYC_DOCUMENT_TYPE_OPTIONS;
  readonly documentTypeLabels = KYC_DOCUMENT_TYPE_LABELS;
  readonly KycStatusEnum = KycStatusEnum;

  kycData: {
    documentType: KycDocumentTypeEnum | '';
    documentNumber: string;
    fullName: string;
    dateOfBirth: string;
    address: string;
  } = {
    documentType: '',
    documentNumber: '',
    fullName: '',
    dateOfBirth: '',
    address: '',
  };

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

loadMyStatus(): void {
  this.statusLoading = true;
  this.statusError = false;

  this.kycService.myKycStatus().subscribe({
    next: (res) => {
      this.myStatus = res;
      this.statusLoading = false;
    },
    error: (err) => {
      console.error('KYC status check failed:', err);
      this.myStatus = null;
      this.statusLoading = false;
      // Treat "no record yet" the same as a 404 — don't block the form.
      // Only flag a real error banner if it's not a 404.
      this.statusError = err?.status !== 404;
    },
  });
}

  get canSubmit(): boolean {
    if (this.statusLoading) return false;
    return !this.myStatus || this.myStatus.status === KycStatusEnum.Rejected;
  }

  private readAsDataUrl(file: File, cb: (url: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  }

  onSelectFront(event: any): void {
    const file = event.addedFiles[event.addedFiles.length - 1];
    this.frontFiles = [file];
    this.readAsDataUrl(file, (url) => (this.frontPreviewUrl = url));
  }
  onRemoveFront(): void {
    this.frontFiles = [];
    this.frontPreviewUrl = null;
  }

  onSelectBack(event: any): void {
    const file = event.addedFiles[event.addedFiles.length - 1];
    this.backFiles = [file];
    this.readAsDataUrl(file, (url) => (this.backPreviewUrl = url));
  }
  onRemoveBack(): void {
    this.backFiles = [];
    this.backPreviewUrl = null;
  }

  onSelectSelfie(event: any): void {
    const file = event.addedFiles[event.addedFiles.length - 1];
    this.selfieFiles = [file];
    this.readAsDataUrl(file, (url) => (this.selfiePreviewUrl = url));
  }
  onRemoveSelfie(): void {
    this.selfieFiles = [];
    this.selfiePreviewUrl = null;
  }

  private uploadFile(file: File, folder: string) {
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', 'trizbot');
    uploadData.append('folder', folder);
    return this.kycService.uploadImage(uploadData);
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

    const front$ = this.uploadFile(this.frontFiles[0], 'kyc/documents');
    const back$ = this.backFiles.length
      ? this.uploadFile(this.backFiles[0], 'kyc/documents')
      : of(null);
    const selfie$ = this.uploadFile(this.selfieFiles[0], 'kyc/selfies');

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
          this.frontFiles = [];
          this.backFiles = [];
          this.selfieFiles = [];
          this.frontPreviewUrl = null;
          this.backPreviewUrl = null;
          this.selfiePreviewUrl = null;
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Could not upload documents or submit KYC. Please try again.';
          this.loading = false;
        },
      });
  }
}