import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../p2p.service';
import { P2POrderType, PAYMENT_METHODS, SUPPORTED_COINS, SUPPORTED_FIAT } from '../p2p.model';

export interface CreateOrderDialogData {
  defaultType: P2POrderType;
}

@Component({
  selector: 'app-create-order-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './create-order-dialog.component.html',
  styleUrls: ['./create-order-dialog.component.scss'],
})
export class CreateOrderDialogComponent {
  readonly P2POrderType = P2POrderType;
  readonly paymentMethodOptions = PAYMENT_METHODS;
  readonly coinOptions = SUPPORTED_COINS;
  readonly fiatOptions = SUPPORTED_FIAT;

  loading = false;
  errorMessage = '';

  form = new FormGroup({
    type: new FormControl<P2POrderType>(P2POrderType.Buy, { nonNullable: true }),
    coin: new FormControl('USDT', [Validators.required]),
    fiatCurrency: new FormControl('NGN', [Validators.required]),
    pricePerUnit: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    totalAmount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.00000001)]),
    minLimit: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    maxLimit: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    paymentMethods: new FormControl<string[]>([], [Validators.required]),
    terms: new FormControl(''),
  });

  constructor(
    private dialogRef: MatDialogRef<CreateOrderDialogComponent>,
    private p2pService: P2pService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrderDialogData
  ) {
    this.form.patchValue({ type: data.defaultType });
  }

  setType(type: P2POrderType): void {
    this.form.patchValue({ type });
  }

  get limitError(): string | null {
    const { minLimit, maxLimit } = this.form.getRawValue();
    if (minLimit && maxLimit && minLimit > maxLimit) {
      return 'Minimum limit cannot be greater than the maximum limit.';
    }
    return null;
  }

  submit(): void {
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
        coin: value.coin!,
        fiatCurrency: value.fiatCurrency!,
        pricePerUnit: value.pricePerUnit!,
        totalAmount: value.totalAmount!,
        minLimit: value.minLimit!,
        maxLimit: value.maxLimit!,
        paymentMethods: value.paymentMethods!,
        terms: value.terms || undefined,
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