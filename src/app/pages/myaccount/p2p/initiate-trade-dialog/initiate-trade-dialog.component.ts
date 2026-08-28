import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../p2p.service';
import {
  P2POrder,
  P2POrderType,
  P2PTrade,
  PaymentMethodDetail,
  TradeStatus,
  canMarkPaid,
  canReleaseFunds,
  fiatSymbol,
  formatCountdown,
  getPaymentMethodsForFiat,
  msUntilDeadline,
} from '../p2p.model';
import { UserPaymentMethod } from '../payment-method/payment-method.model';

export interface InitiateTradeDialogData {
  order?: P2POrder;
  trade?: P2PTrade;
}

const COUNTDOWN_TICK_MS = 1000;
const COUNTDOWN_URGENT_THRESHOLD_MS = 2 * 60 * 1000;
const MAX_PROOF_FILE_BYTES = 4 * 1024 * 1024; // 4MB cap so the base64 payload stays reasonable
const PIN_PATTERN = /^\d{4,6}$/; // 4-6 digit transaction PIN

@Component({
  selector: 'app-initiate-trade-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './initiate-trade-dialog.component.html',
  styleUrls: ['./initiate-trade-dialog.component.scss'],
})
export class InitiateTradeDialogComponent implements OnInit, OnDestroy {
  readonly P2POrderType = P2POrderType;
  readonly TradeStatus = TradeStatus;

  mode: 'initiate' | 'detail' = 'initiate';
  order?: P2POrder;
  trade?: P2PTrade;

  // ---- Initiate-trade form state ----
  coinAmount: number | null = null;
  paymentMethod = '';
  sellerAccountName = '';
  sellerAccountNumber = '';
  sellerBankName = '';
  sellerAdditionalInfo = '';
  transactionPin = ''; // required to lock funds into escrow when starting a trade
  submitting = false;
  errorMessage = '';

  // ---- Trade-detail / payment-proof state ----
  showPaidForm = false;
  proofUrl = '';
  proofNote = '';
  proofFileError = '';
  markingPaid = false;
  releasing = false;
  releasePin = ''; // required to release escrowed funds to the buyer
  releasePinError = '';

  private nowTick = Date.now();
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private dialogRef: MatDialogRef<InitiateTradeDialogComponent>,
    private p2pService: P2pService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: InitiateTradeDialogData
  ) {}

  ngOnInit(): void {
    if (this.data.trade) {
      this.mode = 'detail';
      this.trade = this.data.trade;
    } else if (this.data.order) {
      this.mode = 'initiate';
      this.order = this.data.order;
      const options = getPaymentMethodsForFiat(this.order.fiatCurrency);
      this.paymentMethod = this.order.paymentMethods.find((m) => options.includes(m)) || options[0] || '';
    }
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  close(result?: P2PTrade): void {
    this.dialogRef.close(result);
  }

  // =======================================================================
  // INITIATE TRADE
  // =======================================================================

  get paymentMethodOptions(): string[] {
    if (!this.order) return [];
    const supported = getPaymentMethodsForFiat(this.order.fiatCurrency);
    return this.order.paymentMethods.filter((m) => supported.includes(m));
  }

  get fiatAmount(): number {
    if (!this.order || !this.coinAmount) return 0;
    return this.coinAmount * this.order.pricePerUnit;
  }

  get fiatSymbolForOrder(): string {
    return fiatSymbol(this.order?.fiatCurrency);
  }

  /** Ad owner is the seller — the order already carries their payment
   *  details, so the buyer (me) just needs to see them. */
  get orderCarriesSellerDetails(): boolean {
    return this.order?.type === P2POrderType.Sell;
  }

  /** Ad owner is the buyer — I'm the one selling coin, so I must supply
   *  my own payment details for the buyer to pay into. */
  get mustSupplySellerDetails(): boolean {
    return this.order?.type === P2POrderType.Buy;
  }

  get matchedOrderPaymentDetail(): PaymentMethodDetail | undefined {
    if (!this.order?.paymentDetails?.length) return undefined;
    return this.order.paymentDetails.find((d) => d.method === this.paymentMethod) || this.order.paymentDetails[0];
  }

  get amountValid(): boolean {
    if (!this.order || !this.coinAmount) return false;
    const amt = this.fiatAmount;
    return (
      this.coinAmount > 0 &&
      amt >= this.order.minLimit &&
      amt <= this.order.maxLimit &&
      this.coinAmount <= this.order.availableAmount
    );
  }

  get pinValid(): boolean {
    return PIN_PATTERN.test(this.transactionPin);
  }

  get initiateFormValid(): boolean {
    if (!this.amountValid || !this.paymentMethod || !this.pinValid) return false;
    if (this.mustSupplySellerDetails) {
      return !!this.sellerAccountName.trim() && !!this.sellerAccountNumber.trim();
    }
    return true;
  }

  submitInitiateTrade(): void {
    if (!this.order || !this.initiateFormValid || this.submitting) return;

    this.submitting = true;
    this.errorMessage = '';

    const sellerPaymentDetails: PaymentMethodDetail | undefined = this.mustSupplySellerDetails
      ? {
          method: this.paymentMethod,
          accountName: this.sellerAccountName.trim(),
          accountNumber: this.sellerAccountNumber.trim(),
          bankName: this.sellerBankName.trim() || undefined,
          additionalInfo: this.sellerAdditionalInfo.trim() || undefined,
        }
      : undefined;

    this.p2pService
      .initiateTrade({
        orderId: this.order.id,
        coinAmount: this.coinAmount as number,
        paymentMethod: this.paymentMethod,
        sellerPaymentDetails,
        transactionPin: this.transactionPin,
      })
      .subscribe({
        next: (trade) => {
          this.submitting = false;
          this.transactionPin = '';
          this.sharedService.showToast({ title: 'Trade started. Check the payment window below.' });
          this.close(trade);
        },
        error: (err) => {
          this.submitting = false;
          const message = err?.error?.message || 'Could not start this trade.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  // =======================================================================
  // TRADE DETAIL — countdown, mark-paid, release
  // =======================================================================

  private startCountdown(): void {
    this.stopCountdown();
    this.countdownTimer = setInterval(() => {
      this.nowTick = Date.now();
    }, COUNTDOWN_TICK_MS);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  get countdownLabel(): string {
    if (!this.trade || this.trade.status !== TradeStatus.Pending || !this.trade.paymentDeadline) return '';
    return formatCountdown(msUntilDeadline(this.trade.paymentDeadline, this.nowTick));
  }

  get countdownUrgent(): boolean {
    if (!this.trade || this.trade.status !== TradeStatus.Pending || !this.trade.paymentDeadline) return false;
    const msLeft = msUntilDeadline(this.trade.paymentDeadline, this.nowTick);
    return msLeft > 0 && msLeft <= COUNTDOWN_URGENT_THRESHOLD_MS;
  }

  get countdownExpired(): boolean {
    if (!this.trade || this.trade.status !== TradeStatus.Pending || !this.trade.paymentDeadline) return false;
    return msUntilDeadline(this.trade.paymentDeadline, this.nowTick) <= 0;
  }

  /** True when the CURRENT USER is the buyer on THIS trade (regardless of
   *  whether the underlying ad was a Buy or Sell order) — so this stays
   *  correct in both directions. */
  get canMarkPaid(): boolean {
    return !!this.trade && canMarkPaid(this.trade);
  }

  get canReleaseFunds(): boolean {
    return !!this.trade && canReleaseFunds(this.trade);
  }

  get releasePinValid(): boolean {
    return PIN_PATTERN.test(this.releasePin);
  }

  get proofLooksLikeImage(): boolean {
    const url = this.trade?.paymentProofUrl || this.proofUrl;
    return /\.(png|jpe?g|gif|webp)($|\?)/i.test(url) || url.startsWith('data:image/');
  }

  togglePaidForm(): void {
    this.showPaidForm = !this.showPaidForm;
    this.proofFileError = '';
  }

  onProofFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.proofFileError = 'Please choose an image file.';
      return;
    }
    if (file.size > MAX_PROOF_FILE_BYTES) {
      this.proofFileError = 'Image is too large (max 4MB).';
      return;
    }

    this.proofFileError = '';
    const reader = new FileReader();
    reader.onload = () => {
      // Embeds the screenshot as a data URL for now. Swap this for a real
      // upload-to-storage call once the backend exposes one, and set
      // this.proofUrl to the returned hosted URL instead.
      this.proofUrl = reader.result as string;
    };
    reader.onerror = () => {
      this.proofFileError = 'Could not read that file, please try again.';
    };
    reader.readAsDataURL(file);
  }

  submitMarkPaid(): void {
    if (!this.trade || this.markingPaid) return;
    if (!this.proofUrl.trim()) {
      this.proofFileError = 'Attach a screenshot or paste a link to your payment evidence.';
      return;
    }

    this.markingPaid = true;
    this.p2pService
      .markTradePaid(this.trade.id, {
        paymentProofUrl: this.proofUrl.trim(),
        paymentProofNote: this.proofNote.trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.markingPaid = false;
          this.trade = updated;
          this.showPaidForm = false;
          this.sharedService.showToast({ title: 'Marked as paid. Waiting for the seller to confirm.' });
        },
        error: (err) => {
          this.markingPaid = false;
          const message = err?.error?.message || 'Could not mark this trade as paid.';
          this.proofFileError = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  confirmReleaseFunds(): void {
    if (!this.trade || this.releasing) return;

    this.releasePinError = '';
    if (!this.releasePinValid) {
      this.releasePinError = 'Enter your 4–6 digit transaction PIN.';
      return;
    }

    const confirmed = window.confirm(
      'Only confirm once you have verified the money has actually landed in your account. This releases the coins and cannot be undone.'
    );
    if (!confirmed) return;

    this.releasing = true;
    this.p2pService.releaseTrade(this.trade.id, { transactionPin: this.releasePin }).subscribe({
      next: (updated) => {
        this.releasing = false;
        this.releasePin = '';
        this.trade = updated;
        this.sharedService.showToast({ title: 'Payment confirmed. Coins released to the buyer.' });
      },
      error: (err) => {
        this.releasing = false;
        const message = err?.error?.message || 'Could not release this trade.';
        this.releasePinError = Array.isArray(message) ? message.join(', ') : message;
      },
    });
  }

  tradeFiatSymbol(): string {
    return fiatSymbol(this.trade?.order?.fiatCurrency);
  }

  counterpartyName(): string {
    if (!this.trade) return 'Trader';
    const merchant = this.trade.isBuyer ? this.trade.seller : this.trade.buyer;
    return merchant?.username || 'Trader';
  }






  readonly disputeReasonOptions = [
  'Payment not received',
  'Payment amount is incorrect',
  'Counterparty is unresponsive',
  'Suspicious or unsafe behaviour',
  'Other',
];

showDisputeForm = false;
disputeReason = this.disputeReasonOptions[0];
disputeDetails = '';
disputeSubmitting = false;
disputeError = '';

/** Both buyer and seller can raise this on any trade that isn't finished. */
get canOpenDisputeOrReport(): boolean {
  return !!this.trade && [TradeStatus.Pending, TradeStatus.Paid, TradeStatus.Disputed].includes(this.trade.status);
}

toggleDisputeForm(): void {
  this.showDisputeForm = !this.showDisputeForm;
  this.disputeError = '';
}

submitDispute(): void {
  if (!this.trade || this.disputeSubmitting) return;
  if (!this.disputeReason) {
    this.disputeError = 'Choose a reason for this report.';
    return;
  }
  this.disputeSubmitting = true;
  const reason = this.disputeDetails.trim()
    ? `${this.disputeReason}: ${this.disputeDetails.trim()}`
    : this.disputeReason;

  this.p2pService.disputeTrade(this.trade.id, reason).subscribe({
    next: (updated) => {
      this.disputeSubmitting = false;
      this.showDisputeForm = false;
      this.trade = updated;
      this.sharedService.showToast({ title: 'Dispute opened. Support has been notified.' });
    },
    error: (err) => {
      this.disputeSubmitting = false;
      const message = err?.error?.message || 'Could not open a dispute right now.';
      this.disputeError = Array.isArray(message) ? message.join(', ') : message;
    },
  });
}

contactSupport(): void {
  const subject = encodeURIComponent(`Help with P2P trade ${this.trade?.id ?? ''}`);
  const body = encodeURIComponent(
    `Trade ID: ${this.trade?.id}\nCounterparty: ${this.counterpartyName()}\nStatus: ${this.trade?.status}\n\nDescribe your issue:\n`
  );
  window.open(`mailto:support@yourapp.com?subject=${subject}&body=${body}`, '_blank');
}







mySavedMethods: UserPaymentMethod[] = [];
selectedPaymentMethodId = '';

// in ngOnInit, when mode === 'initiate' and mustSupplySellerDetails:
if (this.mustSupplySellerDetails) {
  this.paymentMethodsService.myMethods().subscribe({
    next: (res) => {
      this.mySavedMethods = res.filter((m) => m.fiatCurrency === this.order!.fiatCurrency);
      const dflt = this.mySavedMethods.find((m) => m.isDefault) || this.mySavedMethods[0];
      this.selectedPaymentMethodId = dflt?.id || '';
    },
  });
}

get initiateFormValid(): boolean {
  if (!this.amountValid || !this.paymentMethod || !this.pinValid) return false;
  if (this.mustSupplySellerDetails) return !!this.selectedPaymentMethodId;
  return true;
}

submitInitiateTrade(): void {
  if (!this.order || !this.initiateFormValid || this.submitting) return;

  this.submitting = true;
  this.errorMessage = '';

  this.p2pService
    .initiateTrade({
      orderId: this.order.id,
      coinAmount: this.coinAmount as number,
      paymentMethod: this.paymentMethod,
      paymentMethodId: this.mustSupplySellerDetails ? this.selectedPaymentMethodId : undefined,
      transactionPin: this.transactionPin,
    })
    .subscribe({
      next: (trade) => {
        this.submitting = false;
        this.transactionPin = '';
        this.sharedService.showToast({ title: 'Trade started. Check the payment window below.' });
        this.close(trade);
      },
      error: (err) => {
        this.submitting = false;
        const message = err?.error?.message || 'Could not start this trade.';
        this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
      },
    });
}



}