import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../p2p.service';
import { P2POrder, P2POrderType, P2PTrade, TradeStatus } from '../p2p.model';

export interface InitiateTradeDialogData {
  /** Present when starting a NEW trade off an order in the market. */
  order?: P2POrder;
  /** Present when opening an EXISTING trade from "My Trades" to view/act on it. */
  trade?: P2PTrade;
}

type DialogMode = 'create' | 'manage';

@Component({
  selector: 'app-initiate-trade-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './initiate-trade-dialog.component.html',
  styleUrls: ['./initiate-trade-dialog.component.scss'],
})
export class InitiateTradeDialogComponent {
  readonly TradeStatus = TradeStatus;

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

  // -----------------------------------------------------------------
  // Create mode — starting a new trade off a market ad
  // -----------------------------------------------------------------

  /** A BUY ad means the poster buys — so whoever takes the ad is selling,
   *  and must supply a PIN to release their crypto into escrow. */
  get requiresPin(): boolean {
    return this.order.type === P2POrderType.Buy;
  }

  get actionVerb(): string {
    return this.order.type === P2POrderType.Buy ? 'Sell' : 'Buy';
  }

  get fiatAmount(): number {
    const amount = this.form.value.coinAmount || 0;
    return amount * this.order.pricePerUnit;
  }

  get limitHint(): string {
    return `Limit: ₦${this.order.minLimit.toLocaleString()} – ₦${this.order.maxLimit.toLocaleString()}`;
  }

  get amountError(): string | null {
    const amount = this.form.value.coinAmount;
    if (amount == null) return null;
    if (amount > this.order.availableAmount) {
      return `Only ${this.order.availableAmount} ${this.order.coin} available.`;
    }
    const fiat = amount * this.order.pricePerUnit;
    if (fiat < this.order.minLimit || fiat > this.order.maxLimit) {
      return `Amount must be between ₦${this.order.minLimit.toLocaleString()} and ₦${this.order.maxLimit.toLocaleString()}.`;
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
  // Manage mode — viewing/acting on a trade already in progress
  // -----------------------------------------------------------------

  get counterpartyUsername(): string {
    if (!this.trade) return '';
    return this.trade.isBuyer ? this.trade.seller.username : this.trade.buyer.username;
  }

  /** In manage mode: true if the current user is the buyer on this trade. */
  get iAmBuyer(): boolean {
    return !!this.trade?.isBuyer;
  }

  get canMarkPaid(): boolean {
    return !!this.trade && this.trade.status === TradeStatus.PendingPayment && this.iAmBuyer;
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
    this.errorMessage = '';
    this.loading = true;
    this.p2pService.markPaid(this.trade.id).subscribe({
      next: (updated) => {
        this.loading = false;
        this.trade = updated;
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