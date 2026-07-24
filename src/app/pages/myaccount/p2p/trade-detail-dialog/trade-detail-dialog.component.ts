import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../p2p.service';
import { P2PTrade, TradeStatus } from '../p2p.model';

export interface TradeDetailDialogData {
  trade: P2PTrade;
}

@Component({
  selector: 'app-trade-detail-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './trade-detail-dialog.component.html',
  styleUrls: ['./trade-detail-dialog.component.scss'],
})
export class TradeDetailDialogComponent implements OnInit, OnDestroy {
  readonly TradeStatus = TradeStatus;

  trade: P2PTrade;
  private destroy$ = new Subject<void>();

  countdownLabel = '';
  countdownExpired = false;

  actionLoading = false;
  errorMessage = '';

  showReleasePin = false;
  showDisputeForm = false;

  releaseForm = new FormGroup({
    transactionPin: new FormControl('', [Validators.required, Validators.minLength(4)]),
  });

  disputeForm = new FormGroup({
    reason: new FormControl('', [Validators.required, Validators.minLength(10)]),
  });

  constructor(
    private dialogRef: MatDialogRef<TradeDetailDialogComponent>,
    private p2pService: P2pService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: TradeDetailDialogData
  ) {
    this.trade = data.trade;
  }

  ngOnInit(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateCountdown());
    this.updateCountdown();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateCountdown(): void {
    if (this.trade.status !== TradeStatus.PendingPayment || !this.trade.paymentDeadline) {
      this.countdownLabel = '';
      return;
    }
    const diffMs = new Date(this.trade.paymentDeadline).getTime() - Date.now();
    if (diffMs <= 0) {
      this.countdownExpired = true;
      this.countdownLabel = 'Expired';
      return;
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.countdownLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  get counterpartyName(): string {
    const other = this.trade.isBuyer ? this.trade.seller : this.trade.buyer;
    return other.username;
  }

  get canMarkPaid(): boolean {
    return this.trade.isBuyer && this.trade.status === TradeStatus.PendingPayment;
  }

  get canRelease(): boolean {
    return !this.trade.isBuyer && this.trade.status === TradeStatus.Paid;
  }

  get canDispute(): boolean {
    return (
      this.trade.status === TradeStatus.PendingPayment || this.trade.status === TradeStatus.Paid
    );
  }

  markPaid(): void {
    this.errorMessage = '';
    this.actionLoading = true;
    this.p2pService.markPaid(this.trade.id).subscribe({
      next: (trade) => {
        this.trade = trade;
        this.actionLoading = false;
        this.sharedService.showToast({ title: 'Marked as paid. Waiting for the seller to release.' });
      },
      error: (err) => this.handleError(err),
    });
  }

  openReleasePin(): void {
    this.showReleasePin = true;
  }

  confirmRelease(): void {
    if (this.releaseForm.invalid) {
      this.releaseForm.markAllAsTouched();
      return;
    }
    this.errorMessage = '';
    this.actionLoading = true;
    const pin = this.releaseForm.getRawValue().transactionPin!;
    this.p2pService.releaseTrade(this.trade.id, pin).subscribe({
      next: (trade) => {
        this.trade = trade;
        this.actionLoading = false;
        this.showReleasePin = false;
        this.sharedService.showToast({ title: 'Crypto released. Trade complete.' });
      },
      error: (err) => this.handleError(err),
    });
  }

  openDisputeForm(): void {
    this.showDisputeForm = true;
  }

  submitDispute(): void {
    if (this.disputeForm.invalid) {
      this.disputeForm.markAllAsTouched();
      return;
    }
    this.errorMessage = '';
    this.actionLoading = true;
    const reason = this.disputeForm.getRawValue().reason!;
    this.p2pService.disputeTrade(this.trade.id, reason).subscribe({
      next: (trade) => {
        this.trade = trade;
        this.actionLoading = false;
        this.showDisputeForm = false;
        this.sharedService.showToast({ title: 'Dispute opened. Our support team has been notified.' });
      },
      error: (err) => this.handleError(err),
    });
  }

  private handleError(err: any): void {
    this.actionLoading = false;
    const message = err?.error?.message || 'Something went wrong. Please try again.';
    this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
  }

  close(): void {
    this.dialogRef.close(this.trade);
  }
}