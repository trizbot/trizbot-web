import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../p2p.service';
import {
  P2POrderType,
  PAYMENT_METHODS,
  PAYMENT_WINDOW_OPTIONS,
  SUPPORTED_COINS,
  SUPPORTED_FIAT,
} from '../p2p.model';

export interface CreateOrderDialogData {
  defaultType: P2POrderType;
  coinSuggestions?: string[];
  fiatSuggestions?: string[];
}

@Component({
  selector: 'app-create-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    MatDialogModule,
    MatAutocompleteModule,
  ],
  templateUrl: './create-order-dialog.component.html',
  styleUrls: ['./create-order-dialog.component.scss'],
})
export class CreateOrderDialogComponent {
  readonly P2POrderType = P2POrderType;
  readonly paymentMethodOptions = PAYMENT_METHODS;
  readonly paymentWindowOptions = PAYMENT_WINDOW_OPTIONS;
  readonly coinSuggestions: string[];
  readonly fiatSuggestions: string[];

  loading = false;
  errorMessage = '';

  form = new FormGroup({
    type: new FormControl<P2POrderType>(P2POrderType.Buy, { nonNullable: true }),
    coin: new FormControl('USDT', { nonNullable: true, validators: [Validators.required] }),
    fiatCurrency: new FormControl('NGN', { nonNullable: true, validators: [Validators.required] }),
    pricePerUnit: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    totalAmount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.00000001)]),
    minLimit: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    maxLimit: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    paymentMethods: new FormControl<string[]>([], { nonNullable: true, validators: [Validators.required] }),
    paymentWindowMinutes: new FormControl<number>(30, { nonNullable: true }),
    terms: new FormControl('', { nonNullable: true }),
    transactionPin: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private dialogRef: MatDialogRef<CreateOrderDialogComponent>,
    private p2pService: P2pService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrderDialogData
  ) {
    this.coinSuggestions = data.coinSuggestions?.length ? data.coinSuggestions : SUPPORTED_COINS;
    this.fiatSuggestions = data.fiatSuggestions?.length ? data.fiatSuggestions : SUPPORTED_FIAT;
    this.form.patchValue({ type: data.defaultType });
    this.syncPinValidator(data.defaultType);
  }

  setType(type: P2POrderType): void {
    this.form.patchValue({ type });
    this.syncPinValidator(type);
  }

  /** Selling an ad locks coins in escrow immediately, so a PIN is required. */
  private syncPinValidator(type: P2POrderType): void {
    const pinControl = this.form.controls.transactionPin;
    if (type === P2POrderType.Sell) {
      pinControl.setValidators([Validators.required, Validators.minLength(4)]);
    } else {
      pinControl.clearValidators();
    }
    pinControl.updateValueAndValidity();
  }

  get isSellAd(): boolean {
    return this.form.value.type === P2POrderType.Sell;
  }

  filteredCoinOptions(): string[] {
    const v = (this.form.get('coin')?.value || '').toString().trim().toUpperCase();
    if (!v) return this.coinSuggestions;
    return this.coinSuggestions.filter((c) => c.includes(v));
  }

  filteredFiatOptions(): string[] {
    const v = (this.form.get('fiatCurrency')?.value || '').toString().trim().toUpperCase();
    if (!v) return this.fiatSuggestions;
    return this.fiatSuggestions.filter((c) => c.includes(v));
  }

  get limitError(): string | null {
    const { minLimit, maxLimit, totalAmount, pricePerUnit } = this.form.getRawValue();
    if (minLimit && maxLimit && minLimit > maxLimit) {
      return 'Minimum limit cannot be greater than the maximum limit.';
    }
    if (maxLimit && totalAmount && pricePerUnit) {
      const maxCoinNeeded = maxLimit / pricePerUnit;
      if (maxCoinNeeded > totalAmount) {
        return 'Your total amount is too small to cover the maximum order limit at this price.';
      }
    }
    return null;
  }

  submit(): void {
    this.form.get('coin')?.setValue((this.form.value.coin || '').toString().trim().toUpperCase());
    this.form
      .get('fiatCurrency')
      ?.setValue((this.form.value.fiatCurrency || '').toString().trim().toUpperCase());

    if (this.form.invalid || this.limitError) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    const value = this.form.getRawValue();

    this.p2pService
      .createOrder({
        type: value.type,
        coin: value.coin,
        fiatCurrency: value.fiatCurrency,
        pricePerUnit: value.pricePerUnit!,
        totalAmount: value.totalAmount!,
        minLimit: value.minLimit!,
        maxLimit: value.maxLimit!,
        paymentMethods: value.paymentMethods,
        terms: value.terms || undefined,
        paymentWindowMinutes: value.paymentWindowMinutes,
        transactionPin: value.type === P2POrderType.Sell ? value.transactionPin : undefined,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.sharedService.showToast({ title: 'Your ad has been posted.' });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          const message = err?.error?.message || 'Could not post this ad. Please try again.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}