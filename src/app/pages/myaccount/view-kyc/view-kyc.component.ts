// view-kyc.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { KycService } from './view-kyc.service';
import {
  KYC_DOCUMENT_TYPE_LABELS,
  KycRecord,
  KycStatusEnum,
  ReviewKycPayload,
} from './model/view-kyc.model';

type ImageSlot = 'front' | 'back' | 'selfie';

@Component({
  selector: 'app-view-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './view-kyc.component.html',
  styleUrls: ['./view-kyc.component.scss'],
})
export class ViewKycComponent implements OnInit {
  private kycService = inject(KycService);
  private sharedService = inject(SharedService);

  readonly documentTypeLabels = KYC_DOCUMENT_TYPE_LABELS;
  readonly KycStatusEnum = KycStatusEnum;

  pendingList: KycRecord[] = [];
  loading = false;

  reviewingId: string | null = null;
  rejectionReasons: Record<string, string> = {};
  showRejectFormId: string | null = null;

  // --- Per-image zoom state ---
  private readonly ZOOM_STEP = 0.25;
  private readonly ZOOM_MIN = 0.5;
  private readonly ZOOM_MAX = 3;

  // Map of recordId -> { front, back, selfie } zoom levels
  private zoomState: { [recordId: string]: { [slot in ImageSlot]?: number } } = {};

  ngOnInit(): void {
    this.loadPending();
  }

  loadPending(): void {
    this.loading = true;
    this.kycService
      .listPending()
      .pipe(
        catchError((err) => {
          console.error('Failed to load pending KYC list:', err);
          this.sharedService.showToast({ title: 'Could not load pending KYC submissions.' });
          return of([] as KycRecord[]);
        }),
      )
      .subscribe((res) => {
        this.pendingList = res ?? [];
        this.loading = false;
      });
  }

  trackById(_index: number, record: KycRecord): string {
    return record._id;
  }

  toggleRejectForm(id: string): void {
    this.showRejectFormId = this.showRejectFormId === id ? null : id;
  }

  approve(record: KycRecord): void {
    this.submitReview(record, { status: KycStatusEnum.Approved });
  }

  reject(record: KycRecord): void {
    const reason = (this.rejectionReasons[record._id] || '').trim();
    if (!reason) {
      this.sharedService.showToast({ title: 'Please enter a rejection reason.' });
      return;
    }
    this.submitReview(record, {
      status: KycStatusEnum.Rejected,
      rejectionReason: reason,
    });
  }

  private submitReview(record: KycRecord, payload: ReviewKycPayload): void {
    this.reviewingId = record._id;

    this.kycService
      .reviewKyc(record._id, payload)
      .pipe(
        catchError((err) => {
          this.sharedService.showToast({ title: 'Could not submit review. Please try again.' });
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.reviewingId = null;
        if (!res) return;
        this.sharedService.showToast({
          title: payload.status === KycStatusEnum.Approved ? 'KYC approved.' : 'KYC rejected.',
        });
        this.pendingList = this.pendingList.filter((r) => r._id !== record._id);
        delete this.rejectionReasons[record._id];
        this.showRejectFormId = null;
      });
  }

  // --- Per-image zoom controls ---
  // Each record's Front/Back/Selfie image zooms independently, keyed by record._id + slot.

  getZoom(recordId: string, slot: ImageSlot): number {
    return this.zoomState[recordId]?.[slot] ?? 1;
  }

  private setZoom(recordId: string, slot: ImageSlot, value: number): void {
    if (!this.zoomState[recordId]) {
      this.zoomState[recordId] = {};
    }
    const clamped = Math.min(this.ZOOM_MAX, Math.max(this.ZOOM_MIN, +value.toFixed(2)));
    this.zoomState[recordId][slot] = clamped;
  }

  zoomIn(recordId: string, slot: ImageSlot): void {
    this.setZoom(recordId, slot, this.getZoom(recordId, slot) + this.ZOOM_STEP);
  }

  zoomOut(recordId: string, slot: ImageSlot): void {
    this.setZoom(recordId, slot, this.getZoom(recordId, slot) - this.ZOOM_STEP);
  }

  resetZoom(recordId: string, slot: ImageSlot): void {
    this.setZoom(recordId, slot, 1);
  }
}