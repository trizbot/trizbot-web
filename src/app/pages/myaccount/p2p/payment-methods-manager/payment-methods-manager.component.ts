import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { PAYMENT_METHODS_BY_FIAT, SUPPORTED_FIAT } from '../model/p2p.model';
import { UserPaymentMethod } from '../payment-method/payment-method.model';
import { PaymentMethodsService } from '../payment-method/payment-methods.service';


@Component({
  selector: 'app-payment-methods-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './payment-methods-manager.component.html',
  styleUrls: ['./payment-methods-manager.component.scss'],
})
export class PaymentMethodsManagerComponent implements OnInit {

  @Output() methodsChanged = new EventEmitter<UserPaymentMethod[]>();

  readonly fiatSuggestions = SUPPORTED_FIAT;

  methods: UserPaymentMethod[] = [];
  loading = false;
  saving = false;
  deletingId: string | null = null;
  editingId: string | null = null;
  showForm = false;

  form = new FormGroup({
    fiatCurrency: new FormControl<string>('NGN', { nonNullable: true, validators: [Validators.required] }),
    method: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    accountName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    accountNumber: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    bankName: new FormControl<string>('', { nonNullable: true }),
    additionalInfo: new FormControl<string>('', { nonNullable: true }),
    isDefault: new FormControl<boolean>(false, { nonNullable: true }),
  });

  constructor(
    private paymentMethodsService: PaymentMethodsService,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get methodOptions(): string[] {
    const fiat = this.form.getRawValue().fiatCurrency;
    return PAYMENT_METHODS_BY_FIAT[fiat] || PAYMENT_METHODS_BY_FIAT['NGN'];
  }

  load(): void {
    this.loading = true;
    this.paymentMethodsService.myMethods().subscribe({
      next: (res) => {
        this.methods = res;
        this.loading = false;
        this.methodsChanged.emit(res);
      },
      error: () => (this.loading = false),
    });
  }

  openAddForm(): void {
    this.editingId = null;
    this.form.reset({
      fiatCurrency: 'NGN', method: '', accountName: '', accountNumber: '',
      bankName: '', additionalInfo: '', isDefault: false,
    });
    this.showForm = true;
  }

  editMethod(m: UserPaymentMethod): void {
    this.editingId = m.id;
    this.form.setValue({
      fiatCurrency: m.fiatCurrency,
      method: m.method,
      accountName: m.accountName,
      accountNumber: m.accountNumber,
      bankName: m.bankName || '',
      additionalInfo: m.additionalInfo || '',
      isDefault: !!m.isDefault,
    });
    this.showForm = true;
  }

  cancel(): void {
    this.showForm = false;
    this.editingId = null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const value = this.form.getRawValue();
    const req$ = this.editingId
      ? this.paymentMethodsService.update(this.editingId, value)
      : this.paymentMethodsService.create(value);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.sharedService.showToast({ title: this.editingId ? 'Payment method updated.' : 'Payment method saved.' });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        const message = err?.error?.message || 'Could not save this payment method.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  remove(m: UserPaymentMethod): void {
    if (!window.confirm(`Remove "${m.method}" (${m.accountNumber})? Ads using it will need a replacement.`)) return;
    this.deletingId = m.id;
    this.paymentMethodsService.delete(m.id).subscribe({
      next: () => {
        this.methods = this.methods.filter((x) => x.id !== m.id);
        this.deletingId = null;
        this.sharedService.showToast({ title: 'Payment method removed.' });
        this.methodsChanged.emit(this.methods);
      },
      error: (err: HttpErrorResponse) => {
        this.deletingId = null;
        const message = err?.error?.message || 'Could not remove this payment method.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }
}