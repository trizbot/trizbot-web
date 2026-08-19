import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../p2p.service';
import {
  P2POrder,
  P2POrderType,
  PAYMENT_WINDOW_OPTIONS,
  PaymentMethodDetail,
  SUPPORTED_COINS,
  SUPPORTED_FIAT,
  fiatSymbol,
  getPaymentMethodsForFiat,
} from '../p2p.model';

export interface CreateOrderDialogData {
  defaultType: P2POrderType;
  coinSuggestions?: string[];
  fiatSuggestions?: string[];
  /** Pass an existing ad here to open the dialog in "edit" mode instead of "create". */
  order?: P2POrder;
}

/** One receiving-account row per selected payment method (Sell ads only).
 *  `existing` prefills the row when editing an ad that already has details saved. */
function buildPaymentDetailGroup(
  method: string,
  required: boolean,
  existing?: Partial<PaymentMethodDetail>
): FormGroup {
  return new FormGroup({
    method: new FormControl<string>(method, { nonNullable: true }),
    accountName: new FormControl<string>(existing?.accountName || '', {
      nonNullable: true,
      validators: required ? [Validators.required] : [],
    }),
    accountNumber: new FormControl<string>(existing?.accountNumber || '', {
      nonNullable: true,
      validators: required ? [Validators.required] : [],
    }),
    bankName: new FormControl<string>(existing?.bankName || '', { nonNullable: true }),
    additionalInfo: new FormControl<string>(existing?.additionalInfo || '', { nonNullable: true }),
  });
}

@Component({
  selector: 'app-create-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    MatDialogModule,
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

  /** Once the user manually types into Max order limit, stop auto-overwriting it. */
  private maxLimitTouchedByUser = false;
  private subs = new Subscription();

  // -----------------------------------------------------------------------
  // Market rate
  // -----------------------------------------------------------------------
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
    paymentMethods: new FormControl<string[]>([], { nonNullable: true, validators: [Validators.required] }),
    paymentWindowMinutes: new FormControl<number>(30, { nonNullable: true }),
    terms: new FormControl('', { nonNullable: true }),
    transactionPin: new FormControl('', { nonNullable: true }),
    paymentDetails: new FormArray<FormGroup>([]),
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

    this.subs.add(
      this.form.controls.fiatCurrency.valueChanges.subscribe((fiat) => {
        const validForFiat = getPaymentMethodsForFiat(fiat);
        const current = this.form.controls.paymentMethods.value;
        const stillValid = current.filter((m) => validForFiat.includes(m));
        if (stillValid.length !== current.length) {
          this.form.controls.paymentMethods.setValue(stillValid);
        }
      })
    );

    this.subs.add(
      this.form.controls.paymentMethods.valueChanges.subscribe((methods) =>
        this.syncPaymentDetailRows(methods)
      )
    );

    // Auto-calculate Max order limit = Total amount to trade × Price per unit.
    this.subs.add(this.form.controls.totalAmount.valueChanges.subscribe(() => this.recomputeMaxLimit()));
    this.subs.add(this.form.controls.pricePerUnit.valueChanges.subscribe(() => this.recomputeMaxLimit()));

    // Load the market rate once up front (covers both create and edit mode,
    // including when coin/fiat controls are disabled and won't re-emit).
    this.loadMarketRate();

    // In create mode the asset/currency pickers are live — refresh the rate
    // whenever either changes. (No-op wiring in edit mode since those
    // controls are disabled and never change.)
    this.subs.add(this.form.controls.coin.valueChanges.subscribe(() => this.loadMarketRate()));
    this.subs.add(this.form.controls.fiatCurrency.valueChanges.subscribe(() => this.loadMarketRate()));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get paymentMethodOptions(): string[] {
    return getPaymentMethodsForFiat(this.form.getRawValue().fiatCurrency);
  }

  get fiatSymbol(): string {
    return fiatSymbol(this.form.getRawValue().fiatCurrency);
  }

  get paymentDetailsArray(): FormArray<FormGroup> {
    return this.form.controls.paymentDetails;
  }

  get isSellAd(): boolean {
    return this.form.value.type === P2POrderType.Sell;
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

  /** Highest price per unit allowed, based on the live market rate plus the
   *  tolerance. Null while the rate hasn't loaded yet. */
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

  /** Bound to (input) on the Max order limit field so we can tell a manual
   *  edit apart from our own programmatic patch. */
  onMaxLimitManualEdit(): void {
    this.maxLimitTouchedByUser = true;
  }

  /** Lets the user snap back to the auto-calculated value after overriding it. */
  resetMaxLimitToAuto(): void {
    this.maxLimitTouchedByUser = false;
    this.recomputeMaxLimit();
  }

  private recomputeMaxLimit(): void {
    if (this.maxLimitTouchedByUser) return;
    const computed = this.computedMaxLimit;
    if (computed != null) {
      // emitEvent:false so this patch doesn't loop back through valueChanges.
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
      paymentMethods: order.paymentMethods,
      paymentWindowMinutes: order.paymentWindowMinutes ?? 30,
      terms: order.terms || '',
    });
    this.syncPaymentDetailRows(order.paymentMethods, order.paymentDetails);
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

  private syncPaymentDetailRows(methods: string[], existingDetails?: PaymentMethodDetail[]): void {
    const array = this.paymentDetailsArray;
    const required = this.isSellAd;
    const existingMethods = array.controls.map((g) => g.get('method')?.value);

    for (let i = array.length - 1; i >= 0; i--) {
      if (!methods.includes(array.at(i).get('method')?.value)) array.removeAt(i);
    }
    methods.forEach((method) => {
      if (!existingMethods.includes(method)) {
        const prefill = existingDetails?.find((d) => d.method === method);
        array.push(buildPaymentDetailGroup(method, required, prefill));
      }
    });
    array.controls.forEach((g) => {
      const validators = required ? [Validators.required] : [];
      g.get('accountName')?.setValidators(validators);
      g.get('accountNumber')?.setValidators(validators);
      g.get('accountName')?.updateValueAndValidity();
      g.get('accountNumber')?.updateValueAndValidity();
    });
  }

  setType(type: P2POrderType): void {
    if (this.isEditMode) return; // type is locked once an ad exists
    this.form.patchValue({ type });
    this.syncPinValidator(type);
    this.syncPaymentDetailRows(this.form.controls.paymentMethods.value);
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

  get paymentDetailsError(): string | null {
    if (!this.isSellAd) return null;
    if (this.form.controls.paymentMethods.value.length > 0 && this.paymentDetailsArray.invalid) {
      return 'Add your receiving account details for each selected payment method.';
    }
    return null;
  }

  private toPaymentDetails(raw: any[]): PaymentMethodDetail[] {
    return raw.map((pd) => ({
      method: pd.method,
      accountName: pd.accountName,
      accountNumber: pd.accountNumber,
      bankName: pd.bankName || undefined,
      additionalInfo: pd.additionalInfo || undefined,
    }));
  }

  submit(): void {
    if (this.form.invalid || this.limitError || this.paymentDetailsError || this.priceError) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    const value = this.form.getRawValue();
    const paymentDetails =
      value.type === P2POrderType.Sell ? this.toPaymentDetails(value.paymentDetails) : undefined;

    if (this.isEditMode) {
      const orderId = this.data.order!.id;
      this.p2pService
        .updateOrder(orderId, {
          pricePerUnit: value.pricePerUnit!,
          totalAmount: value.totalAmount!,
          minLimit: value.minLimit!,
          maxLimit: value.maxLimit!,
          paymentMethods: value.paymentMethods,
          paymentDetails,
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
        paymentDetails,
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