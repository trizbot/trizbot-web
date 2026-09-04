import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { AdminPaymentMethod, SUPPORTED_FIAT } from '../model/p2p.model';
import { P2pPaymentMethodAdminService } from '../service/p2p-payment-method-admin.service';

@Component({
  selector: 'app-p2p-payment-method-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './p2p-payment-method-admin.component.html',
  styleUrls: ['./p2p-payment-method-admin.component.scss'],
})
export class P2pPaymentMethodAdminComponent implements OnInit, OnDestroy {
  readonly fiatSuggestions = SUPPORTED_FIAT;

  methods: AdminPaymentMethod[] = [];
  loading = false;
  saving = false;
  deletingId: string | null = null;
  editingId: string | null = null;
  showForm = false;
  filterFiat = 'ALL';

  form = new FormGroup({
    fiatCurrency: new FormControl<string>('NGN', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    isActive: new FormControl<boolean>(true, { nonNullable: true }),
  });

  private sub: Subscription | null = null;

  constructor(
    private paymentMethodAdminService: P2pPaymentMethodAdminService,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    this.sub = this.paymentMethodAdminService.methods$.subscribe((methods) => {
      this.methods = [...methods].sort((a, b) =>
        a.fiatCurrency === b.fiatCurrency
          ? a.name.localeCompare(b.name)
          : a.fiatCurrency.localeCompare(b.fiatCurrency)
      );
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get visibleMethods(): AdminPaymentMethod[] {
    if (this.filterFiat === 'ALL') return this.methods;
    return this.methods.filter((m) => m.fiatCurrency === this.filterFiat);
  }

  load(): void {
    this.loading = true;
    this.paymentMethodAdminService.refresh().subscribe({
      next: () => (this.loading = false),
      error: () => (this.loading = false),
    });
  }

  openAddForm(): void {
    this.editingId = null;
    this.form.reset({
      fiatCurrency: this.filterFiat === 'ALL' ? 'NGN' : this.filterFiat,
      name: '',
      isActive: true,
    });
    this.showForm = true;
  }

  editMethod(m: AdminPaymentMethod): void {
    this.editingId = m.id;
    this.form.setValue({ fiatCurrency: m.fiatCurrency, name: m.name, isActive: m.isActive });
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
    const payload = {
      fiatCurrency: value.fiatCurrency.toUpperCase(),
      name: value.name.trim(),
      isActive: value.isActive,
    };

    const req$ = this.editingId
      ? this.paymentMethodAdminService.update(this.editingId, payload)
      : this.paymentMethodAdminService.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editingId = null;
        this.sharedService.showToast({
          title: this.editingId ? 'Payment method updated.' : 'Payment method added.',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        const message = err?.error?.message || 'Could not save this payment method.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  toggleActive(m: AdminPaymentMethod): void {
    this.paymentMethodAdminService.update(m.id, { isActive: !m.isActive }).subscribe({
      error: (err: HttpErrorResponse) => {
        const message = err?.error?.message || 'Could not update this payment method.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  remove(m: AdminPaymentMethod): void {
    if (
      !window.confirm(
        `Delete "${m.name}" for ${m.fiatCurrency}? It will disappear from the market filter and new ads immediately.`
      )
    )
      return;

    this.deletingId = m.id;
    this.paymentMethodAdminService.delete(m.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.sharedService.showToast({ title: 'Payment method deleted.' });
      },
      error: (err: HttpErrorResponse) => {
        this.deletingId = null;
        const message = err?.error?.message || 'Could not delete this payment method.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }
}