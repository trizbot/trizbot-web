import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../p2p.service';
import { P2POrder, P2POrderType, P2PTrade, TradeStatus, fiatSymbol } from '../p2p.model';

export interface InitiateTradeDialogData {
  order?: P2POrder;
  trade?: P2PTrade;
}

type DialogMode = 'create' | 'manage';

/** Below this, the countdown turns "urgent" (red) — mirrors Bybit's warning state near timeout. */
const URGENT_THRESHOLD_MS = 5 * 60 * 1000;
const COUNTDOWN_TICK_MS = 250;
/**
 * Never trust a client-side timer alone for anything fraud-sensitive: the tab
 * can be backgrounded, throttled, or the local clock can be wrong. This polls
 * the server's copy of the trade regularly so expiry/dispute/release triggered
 * elsewhere is always reflected here — the countdown is a UX aid, the server
 * response is the source of truth.
 */
const SERVER_SYNC_INTERVAL_MS = 10 * 1000;

@Component({
  selector: 'app-initiate-trade-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './initiate-trade-dialog.component.html',
  styleUrls: ['./initiate-trade-dialog.component.scss'],
})
export class InitiateTradeDialogComponent implements OnInit, OnDestroy {
  readonly TradeStatus = TradeStatus;
  readonly P2POrderType = P2POrderType;

  mode: DialogMode;
  order: P2POrder;
  trade: P2PTrade | null = null;

  loading = false;
  errorMessage = '';

  showDisputeForm = false;
  disputeReason = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] });
  releasePin = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(4)],
  });

  form = new FormGroup({
    coinAmount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.00000001)]),
    paymentMethod: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    transactionPin: new FormControl<string>('', { nonNullable: true }),
  });

  // ---- payment-deadline countdown state ----
  remainingMs = 0;
  remainingLabel = '--:--';
  isUrgent = false;
  isExpiredLocally = false;

  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private serverSyncTimer: ReturnType<typeof setInterval> | null = null;
  private deadlineMs: number | null = null;

  constructor(
    private dialogRef: MatDialogRef<InitiateTradeDialogComponent, P2PTrade | undefined>,
    private p2pService: P2pService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: InitiateTradeDialogData
  ) {
    if (data.trade) {
      this.mode = 'manage';
      this.trade = data.trade;
      this.order = data.trade.order;
    } else {
      this.mode = 'create';
      this.order = data.order!;
      if (this.order.paymentMethods.length === 1) {
        this.form.patchValue({ paymentMethod: this.order.paymentMethods[0] });
      }
      if (this.requiresPin) {
        this.form.controls.transactionPin.setValidators([Validators.required, Validators.minLength(4)]);
      }
    }
  }

  ngOnInit(): void {
    if (this.mode === 'manage' && this.trade) {
      this.setupDeadlineWatch();
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // -----------------------------------------------------------------
  // Currency — everything renders off the order's own fiatCurrency,
  // never a hardcoded symbol, so this dialog works for any market
  // (NGN, USD, GHS, KES, ...) exactly like Bybit's P2P modal does.
  // -----------------------------------------------------------------

  get activeOrder(): P2POrder | null {
    return this.mode === 'manage' ? this.trade?.order ?? null : this.order;
  }

  get currencySymbol(): string {
    return fiatSymbol(this.activeOrder?.fiatCurrency);
  }

  get currencyCode(): string {
    return this.activeOrder?.fiatCurrency ?? '';
  }

  // -----------------------------------------------------------------
  // Payment-deadline countdown
  // -----------------------------------------------------------------

  private setupDeadlineWatch(): void {
    this.clearTimers();
    if (!this.trade?.paymentDeadline || this.trade.status !== TradeStatus.PendingPayment) {
      return;
    }
    this.deadlineMs = new Date(this.trade.paymentDeadline).getTime();
    this.isExpiredLocally = false;
    this.tickCountdown();
    this.countdownTimer = setInterval(() => this.tickCountdown(), COUNTDOWN_TICK_MS);
    this.serverSyncTimer = setInterval(() => this.syncFromServer(), SERVER_SYNC_INTERVAL_MS);
  }

  private tickCountdown(): void {
    if (this.deadlineMs == null) return;
    const msLeft = this.deadlineMs - Date.now();
    this.remainingMs = Math.max(0, msLeft);
    this.isUrgent = this.remainingMs > 0 && this.remainingMs <= URGENT_THRESHOLD_MS;
    this.remainingLabel = this.formatRemaining(this.remainingMs);

    if (msLeft <= 0 && !this.isExpiredLocally) {
      this.isExpiredLocally = true;
      this.handleLocalExpiry();
    }
  }

  private formatRemaining(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /** Reaching zero locally only blocks further buyer/seller action in this
   *  dialog — it never mutates trade state itself. We immediately re-pull the
   *  trade so the UI reflects whatever the server (the actual clock of record)
   *  decided, rather than trusting the client's countdown as ground truth. */
  private handleLocalExpiry(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.syncFromServer();
  }

  private syncFromServer(): void {
    if (!this.trade) return;
    this.p2pService.getTrade(this.trade.id).subscribe({
      next: (updated) => {
        this.trade = updated;
        if (updated.status !== TradeStatus.PendingPayment) {
          this.clearTimers();
        }
      },
      error: () => {
        // Retry on the next sync tick; canMarkPaid already blocks action locally.
      },
    });
  }

  private clearTimers(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.serverSyncTimer) {
      clearInterval(this.serverSyncTimer);
      this.serverSyncTimer = null;
    }
  }

  // -----------------------------------------------------------------
  // Create mode
  // -----------------------------------------------------------------

  get requiresPin(): boolean {
    return this.order.type === P2POrderType.Buy;
  }

  get actionVerb(): string {
    return this.order.type === P2POrderType.Buy ? 'Sell' : 'Buy';
  }

  get isBuyAction(): boolean {
    return this.actionVerb === 'Buy';
  }

  get fiatAmount(): number {
    const amount = this.form.value.coinAmount || 0;
    return amount * this.order.pricePerUnit;
  }

  get limitHint(): string {
    return `Limit: ${this.currencySymbol}${this.order.minLimit.toLocaleString()} – ${this.currencySymbol}${this.order.maxLimit.toLocaleString()}`;
  }

  get amountError(): string | null {
    const amount = this.form.value.coinAmount;
    if (amount == null) return null;
    if (amount > this.order.availableAmount) {
      return `Only ${this.order.availableAmount} ${this.order.coin} available.`;
    }
    const fiat = amount * this.order.pricePerUnit;
    if (fiat < this.order.minLimit || fiat > this.order.maxLimit) {
      return `Amount must be between ${this.currencySymbol}${this.order.minLimit.toLocaleString()} and ${this.currencySymbol}${this.order.maxLimit.toLocaleString()}.`;
    }
    return null;
  }

  submit(): void {
    if (this.form.invalid || this.amountError) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    const value = this.form.getRawValue();

    this.p2pService
      .initiateTrade({
        orderId: this.order.id,
        coinAmount: value.coinAmount!,
        paymentMethod: value.paymentMethod,
        transactionPin: this.requiresPin ? value.transactionPin : undefined,
      })
      .subscribe({
        next: (trade) => {
          this.loading = false;
          this.sharedService.showToast({ title: 'Trade started. Follow the next steps to complete it.' });
          this.dialogRef.close(trade);
        },
        error: (err) => {
          this.loading = false;
          const message = err?.error?.message || 'Could not start this trade. Please try again.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  // -----------------------------------------------------------------
  // Manage mode
  // -----------------------------------------------------------------

  get counterpartyUsername(): string {
    if (!this.trade) return '';
    return this.trade.isBuyer ? this.trade.seller.username : this.trade.buyer.username;
  }

  get iAmBuyer(): boolean {
    return !!this.trade?.isBuyer;
  }

  get canMarkPaid(): boolean {
    return (
      !!this.trade &&
      this.trade.status === TradeStatus.PendingPayment &&
      this.iAmBuyer &&
      !this.isExpiredLocally
    );
  }

  get canRelease(): boolean {
    return !!this.trade && this.trade.status === TradeStatus.Paid && !this.iAmBuyer;
  }

  get canDispute(): boolean {
    return (
      !!this.trade &&
      (this.trade.status === TradeStatus.PendingPayment || this.trade.status === TradeStatus.Paid)
    );
  }

  get isFinalStatus(): boolean {
    if (!this.trade) return false;
    return (
      this.trade.status === TradeStatus.Released ||
      this.trade.status === TradeStatus.Cancelled ||
      this.trade.status === TradeStatus.Expired
    );
  }

  markPaid(): void {
    if (!this.trade) return;
    if (this.isExpiredLocally) {
      this.errorMessage = 'The payment window has ended. Checking the latest trade status…';
      this.syncFromServer();
      return;
    }
    this.errorMessage = '';
    this.loading = true;
    this.p2pService.markPaid(this.trade.id).subscribe({
      next: (updated) => {
        this.loading = false;
        this.trade = updated;
        this.clearTimers();
        this.sharedService.showToast({ title: 'Marked as paid. Waiting for the seller to release.' });
      },
      error: (err) => {
        this.loading = false;
        const message = err?.error?.message || 'Could not mark this trade as paid.';
        this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
      },
    });
  }

  release(): void {
    if (!this.trade || this.releasePin.invalid) {
      this.releasePin.markAsTouched();
      return;
    }
    this.errorMessage = '';
    this.loading = true;
    this.p2pService.releaseTrade(this.trade.id, this.releasePin.value).subscribe({
      next: (updated) => {
        this.loading = false;
        this.trade = updated;
        this.clearTimers();
        this.sharedService.showToast({ title: 'Crypto released. Trade complete.' });
      },
      error: (err) => {
        this.loading = false;
        const message = err?.error?.message || 'Could not release this trade.';
        this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
      },
    });
  }

  openDisputeForm(): void {
    this.showDisputeForm = true;
  }

  submitDispute(): void {
    if (!this.trade || this.disputeReason.invalid) {
      this.disputeReason.markAsTouched();
      return;
    }
    this.errorMessage = '';
    this.loading = true;
    this.p2pService.disputeTrade(this.trade.id, this.disputeReason.value).subscribe({
      next: (updated) => {
        this.loading = false;
        this.trade = updated;
        this.showDisputeForm = false;
        this.clearTimers();
        this.sharedService.showToast({ title: 'Dispute raised. Support will step in shortly.' });
      },
      error: (err) => {
        this.loading = false;
        const message = err?.error?.message || 'Could not raise a dispute.';
        this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
      },
    });
  }

  close(): void {
    this.dialogRef.close(this.mode === 'manage' ? this.trade ?? undefined : undefined);
  }
}