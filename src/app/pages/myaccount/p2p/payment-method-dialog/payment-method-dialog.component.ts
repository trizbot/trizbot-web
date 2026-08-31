import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
// import { PaymentMethodsService } from '../payment-methods.service';
// import { UserPaymentMethod } from './payment-method.model';
import { getPaymentMethodsForFiat } from '../p2p.model';
import { UserPaymentMethod } from '../payment-method/payment-method.model';
import { PaymentMethodsService } from '../payment-method/payment-methods.service';

export interface PaymentMethodDialogData {
  fiatCurrency: string;
  method?: UserPaymentMethod; // pass to edit
}

@Component({
  selector: 'app-payment-method-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  providers: [PaymentMethodsService],
  templateUrl: './payment-method-dialog.component.html',
styleUrls: ['./payment-method-dialog.component.scss'],

})
export class PaymentMethodDialogComponent {
  readonly isEditMode: boolean;
  readonly methodOptions: string[];
  saving = false;
  errorMessage = '';

  form = new FormGroup({
    method: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    accountName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    accountNumber: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    accountType: new FormControl<string>('', { nonNullable: true }),
    bankName: new FormControl<string>('', { nonNullable: true }),
    isDefault: new FormControl<boolean>(false, { nonNullable: true }),
  });

  constructor(
    private dialogRef: MatDialogRef<PaymentMethodDialogComponent>,
    private paymentMethodsService: PaymentMethodsService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: PaymentMethodDialogData
  ) {
    this.isEditMode = !!data.method;
    this.methodOptions = getPaymentMethodsForFiat(data.fiatCurrency);
    if (data.method) {
      this.form.setValue({
        method: data.method.method,
        accountName: data.method.accountName,
        accountNumber: data.method.accountNumber,
        accountType: data.method.accountType || '',
        bankName: data.method.bankName || '',
        isDefault: data.method.isDefault,
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const value = this.form.getRawValue();
    const payload = {
      method: value.method,
      accountName: value.accountName,
      accountNumber: value.accountNumber,
      accountType: value.accountType || undefined,
      bankName: value.bankName || undefined,
      isDefault: value.isDefault,
      fiatCurrency: this.data.fiatCurrency,
    };

    const req$ = this.isEditMode
      ? this.paymentMethodsService.update(this.data.method!.id, payload)
      : this.paymentMethodsService.create(payload);

    req$.subscribe({
      next: (saved) => {
        this.saving = false;
        this.sharedService.showToast({ title: this.isEditMode ? 'Payment method updated.' : 'Payment method added.' });
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.saving = false;
        const message = err?.error?.message || 'Could not save this payment method.';
        this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}