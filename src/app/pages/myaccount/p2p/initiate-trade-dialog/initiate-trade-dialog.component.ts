import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../p2p.service';
import { P2POrder, P2POrderType, P2PTrade } from '../p2p.model';

export interface InitiateTradeDialogData {
  order: P2POrder;
}

@Component({
  selector: 'app-initiate-trade-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './initiate-trade-dialog.component.html',
  styleUrls: ['./initiate-trade-dialog.component.scss'],
})
export class InitiateTradeDialogComponent {
  order: P2POrder;

  loading = false;
  errorMessage = '';

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
    this.order = data.order;
    if (this.order.paymentMethods.length === 1) {
      this.form.patchValue({ paymentMethod: this.order.paymentMethods[0] });
    }
    if (this.requiresPin) {
      this.form.controls.transactionPin.setValidators([Validators.required, Validators.minLength(4)]);
    }
  }

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

  close(): void {
    this.dialogRef.close(undefined);
  }
}