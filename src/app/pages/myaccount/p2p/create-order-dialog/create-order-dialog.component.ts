import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../service/p2p.service';
import { UserPaymentMethod } from '../payment-method/payment-method.model';
import { PaymentMethodsManagerComponent } from '../payment-methods-manager/payment-methods-manager.component';
import {
  P2POrder,
  P2POrderType,
  PAYMENT_WINDOW_OPTIONS,
  SUPPORTED_COINS,
  SUPPORTED_FIAT,
  fiatSymbol,
  getPaymentMethodsForFiat,
} from '../model/p2p.model';

export interface CreateOrderDialogData {
  defaultType: P2POrderType;
  coinSuggestions?: string[];
  fiatSuggestions?: string[];
  /** Pass an existing ad here to open the dialog in "edit" mode instead of "create". */
  order?: P2POrder;
}

@Component({
  selector: 'app-create-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    MatDialogModule,
    PaymentMethodsManagerComponent,
  ],
  templateUrl: './create-order-dialog.component.html',
  styleUrls: ['./create-order-dialog.component.scss'],
})
export class CreateOrderDialogComponent implements OnDestroy {
  readonly P2POrderType = P2POrderType;
  readonly paymentWindowOptions = PAYMENT_WINDOW_OPTIONS;
  readonly coinSuggestions: string[];
  readonly fiatSuggestions: string[];
  readonly isEditMode: boolean;

  /** Max % an ad's price may sit above the live market rate — mirrors the
   *  backend's PRICE_PREMIUM_TOLERANCE_PERCENT. Keep these two in sync. */
  readonly priceTolerancePercent = 10;

  loading = false;
  errorMessage = '';

  /** Full set of the trader's saved payment methods (kept in sync by the
   *  embedded <app-payment-methods-manager>). */
  savedMethods: UserPaymentMethod[] = [];

  private maxLimitTouchedByUser = false;
  private subs = new Subscription();

  marketRate: number | null = null;
  marketRateLoading = false;
  marketRateError = '';
  private marketRateRequestId = 0;

  form = new FormGroup({
    type: new FormControl<P2POrderType>(P2POrderType.Buy, { nonNullable: true }),
    coin: new FormControl('USDT', { nonNullable: true, validators: [Validators.required] }),
    fiatCurrency: new FormControl('NGN', { nonNullable: true, validators: [Validators.required] }),
    pricePerUnit: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    totalAmount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.00000001)]),
    minLimit: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    maxLimit: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    /** Buy ads: generic accepted method names. */
    paymentMethods: new FormControl<string[]>([], { nonNullable: true }),
    /** Sell ads: references into the trader's saved payment methods. */
    paymentMethodIds: new FormControl<string[]>([], { nonNullable: true }),
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
    this.isEditMode = !!data.order;
    this.coinSuggestions = data.coinSuggestions?.length ? data.coinSuggestions : SUPPORTED_COINS;
    this.fiatSuggestions = data.fiatSuggestions?.length ? data.fiatSuggestions : SUPPORTED_FIAT;

    if (this.isEditMode) {
      this.patchFromExistingOrder(data.order!);
      // Coin / fiat / type can't change on an existing ad — could invalidate open trades.
      this.form.controls.coin.disable();
      this.form.controls.fiatCurrency.disable();
      // The saved maxLimit was a deliberate choice — don't silently recompute it.
      this.maxLimitTouchedByUser = true;
    } else {
      this.form.patchValue({ type: data.defaultType });
    }

    this.syncPinValidator(this.form.getRawValue().type);

    // Currency change invalidates whatever payment selection was made.
    this.subs.add(
      this.form.controls.fiatCurrency.valueChanges.subscribe((fiat) => {
        if (!this.isSellAd) {
          const validForFiat = getPaymentMethodsForFiat(fiat);
          const current = this.form.controls.paymentMethods.value;
          const stillValid = current.filter((m) => validForFiat.includes(m));
          if (stillValid.length !== current.length) {
            this.form.controls.paymentMethods.setValue(stillValid);
          }
        } else {
          this.form.controls.paymentMethods.setValue([]);
        }
        this.form.controls.paymentMethodIds.setValue([]);
      })
    );

    // Auto-calculate Max order limit = Total amount to trade × Price per unit.
    this.subs.add(this.form.controls.totalAmount.valueChanges.subscribe(() => this.recomputeMaxLimit()));
    this.subs.add(this.form.controls.pricePerUnit.valueChanges.subscribe(() => this.recomputeMaxLimit()));

    this.loadMarketRate();
    this.subs.add(this.form.controls.coin.valueChanges.subscribe(() => this.loadMarketRate()));
    this.subs.add(this.form.controls.fiatCurrency.valueChanges.subscribe(() => this.loadMarketRate()));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get fiatSymbol(): string {
    return fiatSymbol(this.form.getRawValue().fiatCurrency);
  }

  get isSellAd(): boolean {
    return this.form.getRawValue().type === P2POrderType.Sell;
  }

  // -----------------------------------------------------------------------
  // Payment methods
  // -----------------------------------------------------------------------

  get paymentMethodOptions(): string[] {
    return getPaymentMethodsForFiat(this.form.getRawValue().fiatCurrency);
  }

  /** Called whenever the embedded manager's saved-method list changes. */
  onMethodsChanged(methods: UserPaymentMethod[]): void {
    this.savedMethods = methods;
    const eligibleIds = this.eligibleSavedMethods.map((m) => m.id);
    const current = this.form.controls.paymentMethodIds.value;
    const stillValid = current.filter((id) => eligibleIds.includes(id));
    if (stillValid.length !== current.length) {
      this.form.controls.paymentMethodIds.setValue(stillValid);
    }
    this.syncPaymentMethodNamesFromSelection();
  }

  /** Only offer saved methods that match the ad's fiat currency. */
  get eligibleSavedMethods(): UserPaymentMethod[] {
    const fiat = this.form.getRawValue().fiatCurrency;
    return this.savedMethods.filter((m) => m.fiatCurrency === fiat);
  }

  isMethodSelected(id: string): boolean {
    return this.form.getRawValue().paymentMethodIds.includes(id);
  }

  onSavedMethodToggle(id: string, checked: boolean): void {
    const current = this.form.getRawValue().paymentMethodIds;
    const next = checked ? [...current, id] : current.filter((x) => x !== id);
    this.form.controls.paymentMethodIds.setValue(next);
    this.syncPaymentMethodNamesFromSelection();
  }

  /** For Sell ads, `paymentMethods` (the display names) is always derived
   *  from whichever saved accounts are ticked — never edited directly. */
  private syncPaymentMethodNamesFromSelection(): void {
    if (!this.isSellAd) return;
    const ids = this.form.getRawValue().paymentMethodIds;
    const selected = this.savedMethods.filter((m) => ids.includes(m.id));
    this.form.controls.paymentMethods.setValue(Array.from(new Set(selected.map((m) => m.method))));
  }

  get paymentMethodsError(): string | null {
    if (this.isSellAd) return null;
    if (this.form.getRawValue().paymentMethods.length === 0) {
      return 'Select at least one accepted payment method.';
    }
    return null;
  }

  get paymentMethodIdsError(): string | null {
    if (!this.isSellAd) return null;
    if (this.form.getRawValue().paymentMethodIds.length === 0) {
      return 'Select at least one saved payment method for this ad.';
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // Market rate
  // -----------------------------------------------------------------------

  private loadMarketRate(): void {
    const { coin, fiatCurrency } = this.form.getRawValue();
    if (!coin || !fiatCurrency) return;

    const requestId = ++this.marketRateRequestId;
    this.marketRateLoading = true;
    this.marketRateError = '';

    this.p2pService.getExchangeRate(coin, fiatCurrency).subscribe({
      next: (res) => {
        if (requestId !== this.marketRateRequestId) return; // stale response, coin/fiat changed since
        this.marketRate = res.rate;
        this.marketRateLoading = false;
      },
      error: () => {
        if (requestId !== this.marketRateRequestId) return;
        this.marketRate = null;
        this.marketRateLoading = false;
        this.marketRateError = 'No current market rate. You can still continue, but double-check your price.';
      },
    });
  }

  get maxAllowedPrice(): number | null {
    if (this.marketRate == null) return null;
    return this.marketRate * (1 + this.priceTolerancePercent / 100);
  }

  get priceExceedsMarketRate(): boolean {
    const price = this.form.getRawValue().pricePerUnit;
    if (price == null || this.maxAllowedPrice == null) return false;
    return price > this.maxAllowedPrice;
  }

  get priceError(): string | null {
    if (this.priceExceedsMarketRate && this.marketRate != null && this.maxAllowedPrice != null) {
      return `Price per unit cannot exceed ${this.fiatSymbol}${this.maxAllowedPrice.toFixed(2)} ` +
        `(market rate ${this.fiatSymbol}${this.marketRate.toFixed(2)} + ${this.priceTolerancePercent}% max).`;
    }
    return null;
  }

  /** Lets the user snap the price down to the current market rate. */
  useMarketRate(): void {
    if (this.marketRate == null) return;
    this.form.controls.pricePerUnit.setValue(Number(this.marketRate.toFixed(2)));
  }

  // -----------------------------------------------------------------------
  // Auto max-limit calculation
  // -----------------------------------------------------------------------

  /** Total amount × price = the most fiat this ad could ever be worth. */
  get computedMaxLimit(): number | null {
    const { totalAmount, pricePerUnit } = this.form.getRawValue();
    if (!totalAmount || !pricePerUnit) return null;
    return totalAmount * pricePerUnit;
  }

  onMaxLimitManualEdit(): void {
    this.maxLimitTouchedByUser = true;
  }

  resetMaxLimitToAuto(): void {
    this.maxLimitTouchedByUser = false;
    this.recomputeMaxLimit();
  }

  private recomputeMaxLimit(): void {
    if (this.maxLimitTouchedByUser) return;
    const computed = this.computedMaxLimit;
    if (computed != null) {
      this.form.controls.maxLimit.setValue(Math.floor(computed), { emitEvent: false });
    }
  }

  // -----------------------------------------------------------------------
  // Edit mode
  // -----------------------------------------------------------------------

  private patchFromExistingOrder(order: P2POrder): void {
    this.form.patchValue({
      type: order.type,
      coin: order.coin,
      fiatCurrency: order.fiatCurrency,
      pricePerUnit: order.pricePerUnit,
      totalAmount: order.availableAmount ?? order.totalAmount,
      minLimit: order.minLimit,
      maxLimit: order.maxLimit,
      paymentMethods: order.paymentMethods || [],
      paymentMethodIds: order.paymentMethodIds || [],
      paymentWindowMinutes: order.paymentWindowMinutes ?? 30,
      terms: order.terms || '',
    });
  }

  private syncPinValidator(type: P2POrderType): void {
    const pinControl = this.form.controls.transactionPin;
    if (type === P2POrderType.Sell && !this.isEditMode) {
      pinControl.setValidators([Validators.required, Validators.minLength(4)]);
    } else {
      pinControl.clearValidators();
    }
    pinControl.updateValueAndValidity();
  }

  setType(type: P2POrderType): void {
    if (this.isEditMode) return; // type is locked once an ad exists
    this.form.patchValue({ type });
    this.syncPinValidator(type);
    this.form.controls.paymentMethods.setValue([]);
    this.form.controls.paymentMethodIds.setValue([]);
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
    if (
      this.form.invalid ||
      this.limitError ||
      this.paymentMethodsError ||
      this.paymentMethodIdsError ||
      this.priceError
    ) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    const value = this.form.getRawValue();

    if (this.isEditMode) {
      const orderId = this.data.order!.id;
      this.p2pService
        .updateOrder(orderId, {
          pricePerUnit: value.pricePerUnit!,
          totalAmount: value.totalAmount!,
          minLimit: value.minLimit!,
          maxLimit: value.maxLimit!,
          paymentMethods: value.paymentMethods,
          paymentMethodIds: value.paymentMethodIds,
          terms: value.terms || undefined,
          paymentWindowMinutes: value.paymentWindowMinutes,
          transactionPin: value.transactionPin || undefined,
        })
        .subscribe({
          next: () => {
            this.loading = false;
            this.sharedService.showToast({ title: 'Your ad has been updated.' });
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.loading = false;
            const message = err?.error?.message || 'Could not update this ad. Please try again.';
            this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
          },
        });
      return;
    }

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
        paymentMethodIds: value.paymentMethodIds,
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