import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../service/p2p.service';
import { PaymentMethodsService } from '../payment-method/payment-methods.service';
import { UserPaymentMethod } from '../payment-method/payment-method.model';
import {
  P2POrder,
  P2POrderType,
  P2PTrade,
  TradeStatus,
  canMarkPaid,
  canReleaseFunds,
  canCancelTrade,
  isPaymentWindowExpired,
  isCompletePaymentMethod,
  maskAccountNumber,
  fiatSymbol,
  formatCountdown,
  getPaymentMethodsForFiat,
  msUntilDeadline,
  buildPaymentMethodDetails,
} from '../model/p2p.model';
import { P2pTradeChatComponent } from '../trade-chat/p2p-trade-chat.component';

export interface InitiateTradeDialogData {
  order?: P2POrder;
  trade?: P2PTrade;
}

const COUNTDOWN_TICK_MS = 1000;
const COUNTDOWN_URGENT_THRESHOLD_MS = 2 * 60 * 1000;
const MAX_PROOF_FILE_BYTES = 4 * 1024 * 1024; // 4MB cap so the base64 payload stays reasonable
const PIN_PATTERN = /^\d{4,6}$/; // 4-6 digit transaction PIN
const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCKOUT_MS = 60 * 1000;

const SELLER_REVIEW_WINDOW_MS = 15 * 60 * 1000;

// --- Auto-verification / auto-release tuning ---------------------------
const VERIFICATION_POLL_INTERVAL_MS = 5000;
const VERIFICATION_POLL_TIMEOUT_MS = 10 * 60 * 1000;

// --- Payment-detail resolution retry tuning -----------------------------
// The seller's payment method is sometimes snapshotted onto the trade
// asynchronously (e.g. right after creation, or only fully populated once
// the order's nested payment details are attached server-side). A single
// getTrade() call made the instant the dialog opens can land just before
// that write finishes and come back with nothing usable, even though the
// data exists moments later. Retrying a few times with a short delay before
// giving up avoids flashing the "not showing yet" banner for a transient
// race instead of a genuine missing-data case.
const PAYMENT_DETAIL_RETRY_MAX = 4;
const PAYMENT_DETAIL_RETRY_DELAY_MS = 1500;

type TradeStep = 'created' | 'paid' | 'released' | 'disputed';

/** Why matchedOrderPaymentDetail came back empty after we tried to resolve it. */
type SellerDetailsError = 'none-attached' | 'failed' | null;

@Component({
  selector: 'app-initiate-trade-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, P2pTradeChatComponent],
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
  transactionPin = ''; // required to lock funds into escrow when starting a trade
  submitting = false;
  errorMessage = '';
  amountPreset: 25 | 50 | 75 | 100 | null = null;

  detailView: 'info' | 'chat' = 'info';
  setDetailView(view: 'info' | 'chat'): void {
    this.detailView = view;
  }

  initiatePinAttempts = 0;
  initiatePinLockedUntil = 0;

  mySavedMethods: UserPaymentMethod[] = [];
  mySavedMethodsLoading = false;
  selectedPaymentMethodId = '';

  // True while we're re-fetching the single order to pick up payment
  // details that weren't included on the (lighter) list/market payload.
  sellerDetailsLoading = false;
  /** Why the seller's payment detail is still unresolved, if it is. */
  sellerDetailsError: SellerDetailsError = null;
  private sellerDetailsRefetchAttempted = false;

  // ---- Trade-detail / payment-proof state ----
  showPaidForm = false;
  proofUrl = '';
  proofNote = '';
  proofFileError = '';
  markingPaid = false;
  releasing = false;
  releasePin = ''; // required to release escrowed funds to the buyer (manual path)
  releasePinError = '';
  releasePinAttempts = 0;
  releasePinLockedUntil = 0;
  copiedField: string | null = null;
  private copiedResetTimer: ReturnType<typeof setTimeout> | null = null;

  cancelling = false;
  refreshingTrade = false;

  // True while we're auto-retrying getTrade() to resolve the payment
  // detail after opening the dialog (see PAYMENT_DETAIL_RETRY_* above).
  // The template shows a loader instead of the "not showing yet" banner
  // while this is true.
  paymentDetailRetrying = false;
  private paymentDetailRetryAttempt = 0;
  private paymentDetailRetryTimer: ReturnType<typeof setTimeout> | null = null;

  private revealedFields = new Set<string>();

  showDisputeForm = false;
  disputeReason = '';
  disputeDetails = '';
  disputeSubmitting = false;
  disputeError = '';

  readonly disputeReasonOptions = [
    'Payment not received',
    'Payment amount is incorrect',
    'Counterparty is unresponsive',
    'Suspicious or unsafe behaviour',
    'Other',
  ];

  readonly amountPresetOptions: ReadonlyArray<25 | 50 | 75 | 100> = [25, 50, 75, 100];

  private nowTick = Date.now();
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  // ---- Auto-verification / auto-release state ----
  verificationStatus: 'idle' | 'pending' | 'verifying' | 'verified' | 'failed' | 'timed-out' = 'idle';
  autoReleaseInFlight = false;
  private verificationPollTimer: ReturnType<typeof setInterval> | null = null;
  private verificationPollStartedAt = 0;

  constructor(
    private dialogRef: MatDialogRef<InitiateTradeDialogComponent>,
    private p2pService: P2pService,
    private paymentMethodsService: PaymentMethodsService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: InitiateTradeDialogData
  ) {
    this.disputeReason = this.disputeReasonOptions[0];
  }

  ngOnInit(): void {
    if (this.data.trade) {
      this.mode = 'detail';
      this.trade = this.data.trade;

      // If we're opening a trade that's already marked paid and is waiting
      // on verification, resume polling instead of leaving it stuck.
      if (this.trade.status === TradeStatus.Paid && this.trade.autoReleaseEligible) {
        this.startVerificationPolling();
      }

      // FIX: previously called refreshTrade() once and, if that single
      // response still didn't carry a usable payment detail, left the user
      // staring at the "not showing yet" banner even when the backend was
      // just about to finish snapshotting it. Now retries a few times with
      // a short delay (see PAYMENT_DETAIL_RETRY_* constants) before
      // conceding and showing the banner with a manual retry option.
      if (!this.resolvedPaymentDetail) {
        this.beginPaymentDetailRetry();
      }
    } else if (this.data.order) {
      this.mode = 'initiate';
      this.order = this.data.order;
      const options = getPaymentMethodsForFiat(this.order.fiatCurrency);
      this.paymentMethod = this.order.paymentMethods.find((m) => options.includes(m)) || options[0] || '';

      if (this.mustSupplySellerDetails) {
        this.loadMySavedMethods();
      } else if (this.orderCarriesSellerDetails) {
        if (this.matchedOrderPaymentDetail) {
          // Market payload already carried a usable seller account — nothing to fetch.
          this.sellerDetailsError = null;
        } else {
          // The order came back without a usable payment detail — either the
          // list payload just didn't include it, or it genuinely doesn't
          // exist. Re-fetch the single order, which should return the fully
          // populated form; refreshOrderPaymentDetails() below decides which
          // of those two cases we're actually in.
          this.refreshOrderPaymentDetails();
        }
      }
    }
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.stopVerificationPolling();
    if (this.copiedResetTimer) clearTimeout(this.copiedResetTimer);
    if (this.paymentDetailRetryTimer) clearTimeout(this.paymentDetailRetryTimer);
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

  get orderCarriesSellerDetails(): boolean {
    return this.order?.type === P2POrderType.Sell;
  }

  get mustSupplySellerDetails(): boolean {
    return this.order?.type === P2POrderType.Buy;
  }

  private get resolvedOrderPaymentDetails(): UserPaymentMethod[] {
    if (!this.order) return [];
    // buildPaymentMethodDetails() already filters out incomplete entries,
    // so anything that comes back here is guaranteed to have a method and
    // an account number.
    return buildPaymentMethodDetails(
      this.order.paymentMethodDetails,
      this.order.paymentDetails,
      this.order.paymentMethodIds,
      this.order.fiatCurrency
    );
  }

  /**
   * FIX: previously this returned `details[0]` (or a match) as soon as the
   * array was non-empty, even if that entry's fields were blank — which is
   * exactly what produced the empty "You'll send payment to" card. Now the
   * source array is already filtered to complete entries only, so anything
   * returned here is guaranteed renderable. If nothing complete exists,
   * this correctly returns undefined and the "none-attached" banner shows
   * instead of a blank card.
   */
  get matchedOrderPaymentDetail(): UserPaymentMethod | undefined {
    const details = this.resolvedOrderPaymentDetails;
    if (!details.length) return undefined;
    const match = details.find((d) => d.method === this.paymentMethod) || details[0];
    return isCompletePaymentMethod(match) ? match : undefined;
  }

  get sellerPaymentResolved(): boolean {
    if (!this.orderCarriesSellerDetails) return true;
    return !!this.matchedOrderPaymentDetail;
  }

  private refreshOrderPaymentDetails(): void {
    if (!this.order || this.sellerDetailsLoading) return;
    this.sellerDetailsRefetchAttempted = true;
    this.sellerDetailsLoading = true;
    this.sellerDetailsError = null;

    this.p2pService.getOrder(this.order.id).subscribe({
      next: (fullOrder) => {
        this.sellerDetailsLoading = false;
        this.order = fullOrder;
        this.sellerDetailsError = this.matchedOrderPaymentDetail ? null : 'none-attached';
      },
      error: () => {
        this.sellerDetailsLoading = false;
        this.sellerDetailsError = 'failed';
      },
    });
  }

  retrySellerDetails(): void {
    if (this.sellerDetailsError !== 'failed') return;
    this.refreshOrderPaymentDetails();
  }

  get canRetrySellerDetails(): boolean {
    return this.orderCarriesSellerDetails && !this.sellerDetailsLoading && this.sellerDetailsError === 'failed';
  }

  private loadMySavedMethods(): void {
    this.mySavedMethodsLoading = true;
    this.paymentMethodsService.myMethods().subscribe({
      next: (res) => {
        this.mySavedMethods = res.filter((m) => m.fiatCurrency === this.order!.fiatCurrency);
        const dflt = this.mySavedMethods.find((m) => m.isDefault) || this.mySavedMethods[0];
        this.selectedPaymentMethodId = dflt?.id || '';
        this.mySavedMethodsLoading = false;
      },
      error: () => (this.mySavedMethodsLoading = false),
    });
  }

  applyAmountPreset(pct: 25 | 50 | 75 | 100): void {
    if (!this.order) return;
    this.amountPreset = pct;
    const raw = (this.order.availableAmount * pct) / 100;
    this.coinAmount = Math.floor(raw * 10000) / 10000;
  }

  onAmountManualEdit(): void {
    this.amountPreset = null;
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

  get initiatePinLocked(): boolean {
    return this.initiatePinLockedUntil > this.nowTick;
  }

  get initiatePinLockLabel(): string {
    return formatCountdown(Math.max(0, this.initiatePinLockedUntil - this.nowTick));
  }

  /**
   * The Buy/Sell button stays disabled until we have a confirmed payment
   * target (or have confirmed there genuinely isn't one, in which case it
   * should never enable).
   */
  get initiateFormValid(): boolean {
    if (!this.amountValid || !this.paymentMethod || !this.pinValid) return false;
    if (this.initiatePinLocked) return false;
    if (this.mustSupplySellerDetails) return !!this.selectedPaymentMethodId;
    if (this.orderCarriesSellerDetails) {
      if (this.sellerDetailsLoading) return false;
      if (!this.sellerPaymentResolved) return false;
    }
    return true;
  }

  /**
   * The specific saved payment method that should be locked onto the trade
   * being created, regardless of which side supplies it.
   *
   *  - Buying against a Sell ad: it's the seller's account we resolved
   *    above (`matchedOrderPaymentDetail`).
   *  - Selling into a Buy ad: it's the account I picked from my own saved
   *    methods (`selectedPaymentMethodId`).
   *
   * This is what actually gets sent to the backend so the payment target
   * is snapshotted onto the trade record at creation time, instead of
   * being re-derived later from the (possibly since-changed) order.
   */
  private get resolvedTradePaymentMethodId(): string | undefined {
    if (this.mustSupplySellerDetails) {
      return this.selectedPaymentMethodId || undefined;
    }
    if (this.orderCarriesSellerDetails) {
      return this.matchedOrderPaymentDetail?.id || undefined;
    }
    return undefined;
  }

  /**
   * The full payment-method object matching resolvedTradePaymentMethodId,
   * used only to optimistically render the "Payment goes to" card the
   * instant a trade is created — before any refetch. This is a client-side
   * convenience, not a substitute for the backend persisting it: if the
   * dialog is reopened later (e.g. after reload), only what the server
   * actually stored on the trade will be shown (which is why the retry
   * logic below exists — the server-side write can lag behind this
   * optimistic value).
   */
  private get resolvedTradePaymentMethodDetail(): UserPaymentMethod | undefined {
    if (this.mustSupplySellerDetails) {
      const detail = this.mySavedMethods.find((m) => m.id === this.selectedPaymentMethodId);
      return isCompletePaymentMethod(detail) ? detail : undefined;
    }
    if (this.orderCarriesSellerDetails) {
      return this.matchedOrderPaymentDetail;
    }
    return undefined;
  }

  submitInitiateTrade(): void {
    if (!this.order || !this.initiateFormValid || this.submitting) return;
    if (this.initiatePinLocked) {
      this.errorMessage = `Too many attempts. Try again in ${this.initiatePinLockLabel}.`;
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    // Keep a reference before the async call — `this.matchedOrderPaymentDetail`
    // etc. are derived getters and stay valid, but capturing the object now
    // makes the optimistic-merge intent explicit and immune to any state
    // change while the request is in flight.
    const optimisticDetail = this.resolvedTradePaymentMethodDetail;

    this.p2pService
      .initiateTrade({
        orderId: this.order.id,
        coinAmount: this.coinAmount as number,
        paymentMethod: this.paymentMethod,
        // Sent for both directions so the backend can resolve and persist
        // the correct payment target on the trade record — this is what
        // makes "Payment goes to" show up reliably in the trade-detail view
        // instead of falling back to the "not showing yet" banner.
        paymentMethodId: this.resolvedTradePaymentMethodId,
        transactionPin: this.transactionPin,
      })
      .subscribe({
        next: (trade) => {
          this.submitting = false;
          this.transactionPin = '';
          this.initiatePinAttempts = 0;
          this.sharedService.showToast({ title: 'Trade started. Check the payment window below.' });

          // If the server response doesn't (yet) carry a complete
          // `sellerPaymentMethod` — e.g. the snapshot write is still in
          // flight — patch in what we already resolved locally so the
          // buyer/seller isn't shown a blank "not showing yet" banner
          // immediately after starting the trade. This is optimistic
          // display only; it does not persist anything, and a later
          // refresh will reflect whatever the server actually has stored
          // (the retry loop in ngOnInit covers that case if this dialog
          // instance gets reopened before the write lands).
          const finalTrade: P2PTrade = isCompletePaymentMethod(trade.sellerPaymentMethod)
            ? trade
            : optimisticDetail
            ? { ...trade, sellerPaymentMethod: optimisticDetail }
            : trade;

          this.close(finalTrade);
        },
        error: (err) => {
          this.submitting = false;
          this.transactionPin = '';
          this.initiatePinAttempts += 1;
          if (this.initiatePinAttempts >= MAX_PIN_ATTEMPTS) {
            this.initiatePinLockedUntil = Date.now() + PIN_LOCKOUT_MS;
            this.initiatePinAttempts = 0;
          }
          const message = err?.error?.message || 'Could not start this trade.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  // =======================================================================
  // TRADE DETAIL — step state
  // =======================================================================

  get currentStep(): TradeStep {
    if (!this.trade) return 'created';
    switch (this.trade.status) {
      case TradeStatus.Disputed:
        return 'disputed';
      case TradeStatus.Completed:
        return 'released';
      case TradeStatus.Paid:
        return 'paid';
      default:
        return 'created';
    }
  }

  get stepIndex(): number {
    return { created: 0, paid: 1, released: 2, disputed: 1 }[this.currentStep];
  }

  // =======================================================================
  // TRADE DETAIL — countdown #1: buyer's payment window
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

  get isPaymentExpired(): boolean {
    return !!this.trade && isPaymentWindowExpired(this.trade, this.nowTick);
  }

  get paymentWindowFraction(): number {
    if (!this.trade?.paymentDeadline || !this.order?.paymentWindowMinutes) return 0;
    const totalMs = this.order.paymentWindowMinutes * 60 * 1000;
    const msLeft = Math.max(0, msUntilDeadline(this.trade.paymentDeadline, this.nowTick));
    return totalMs > 0 ? Math.min(1, msLeft / totalMs) : 0;
  }

  refreshTrade(): void {
    if (!this.trade || this.refreshingTrade) return;
    this.refreshingTrade = true;
    this.p2pService.getTrade(this.trade.id).subscribe({
      next: (updated) => {
        this.refreshingTrade = false;
        this.trade = updated;
      },
      error: () => {
        this.refreshingTrade = false;
      },
    });
  }

  // =======================================================================
  // TRADE DETAIL — countdown #2: seller's response window (buyer protection)
  // =======================================================================

  private get sellerReviewDeadlineMs(): number | null {
    if (!this.trade?.paidAt) return null;
    return new Date(this.trade.paidAt).getTime() + SELLER_REVIEW_WINDOW_MS;
  }

  get sellerReviewActive(): boolean {
    return !!this.trade && this.trade.status === TradeStatus.Paid && this.sellerReviewDeadlineMs != null;
  }

  get sellerReviewMsLeft(): number {
    const deadline = this.sellerReviewDeadlineMs;
    if (deadline == null) return 0;
    return deadline - this.nowTick;
  }

  get sellerReviewLabel(): string {
    if (!this.sellerReviewActive) return '';
    return formatCountdown(Math.max(0, this.sellerReviewMsLeft));
  }

  get sellerReviewUrgent(): boolean {
    return this.sellerReviewActive && this.sellerReviewMsLeft > 0 && this.sellerReviewMsLeft <= 2 * 60 * 1000;
  }

  get sellerReviewOverdue(): boolean {
    return this.sellerReviewActive && this.sellerReviewMsLeft <= 0;
  }

  get sellerReviewFraction(): number {
    if (!this.sellerReviewActive) return 0;
    return Math.min(1, Math.max(0, this.sellerReviewMsLeft) / SELLER_REVIEW_WINDOW_MS);
  }

  // =======================================================================
  // TRADE DETAIL — payment details (full display, gated on completeness)
  // =======================================================================

  /**
   * Same defensive resolution as `resolvedOrderPaymentDetails` above, but
   * for a trade already in progress: prefer the account actually locked to
   * the trade record (`trade.sellerPaymentMethod`), then fall back to the
   * order's resolved details. Both paths are already filtered to complete
   * entries, so this never renders a blank-fielded card — if nothing usable
   * exists, this returns undefined and the template's "Payment details
   * aren't showing yet" fallback banner is shown instead (after the retry
   * loop in ngOnInit / beginPaymentDetailRetry has had a chance to catch a
   * delayed snapshot write).
   *
   * NOTE: the order-based fallback re-derives the seller's account from the
   * *current* state of the ad, which the seller could have edited or
   * deleted since the trade started, and is structurally unavailable for
   * trades where I supplied my own saved method (Buy-type orders) — for
   * those, `trade.sellerPaymentMethod` is the only source of truth.
   */
  get resolvedPaymentDetail(): UserPaymentMethod | undefined {
    if (!this.trade) return undefined;
    if (isCompletePaymentMethod(this.trade.sellerPaymentMethod)) return this.trade.sellerPaymentMethod;

    const order = this.trade.order;
    if (!order) return undefined;

    const details = buildPaymentMethodDetails(
      order.paymentMethodDetails,
      order.paymentDetails,
      order.paymentMethodIds,
      order.fiatCurrency
    );
    if (!details.length) return undefined;

    const match = details.find((d) => d.method === this.trade!.paymentMethod) || details[0];
    return isCompletePaymentMethod(match) ? match : undefined;
  }

  get paymentDetailExtraFields(): { label: string; value: string }[] {
    const detail = this.resolvedPaymentDetail as unknown as Record<string, unknown> | undefined;
    if (!detail) return [];
    const known = new Set([
      'id', '_id', 'method', 'accountName', 'accountNumber', 'bankName',
      'additionalInfo', 'fiatCurrency', 'isDefault', 'createdAt', 'updatedAt',
    ]);
    return Object.keys(detail)
      .filter((k) => !known.has(k) && detail[k] !== null && detail[k] !== undefined && detail[k] !== '')
      .map((k) => ({ label: this.humanizeKey(k), value: String(detail[k]) }));
  }

  private humanizeKey(key: string): string {
    const spaced = key.replace(/([A-Z])/g, ' $1').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  isRevealed(field: string): boolean {
    return this.revealedFields.has(field);
  }

  toggleReveal(field: string): void {
    if (this.revealedFields.has(field)) this.revealedFields.delete(field);
    else this.revealedFields.add(field);
  }

  maskedAccountNumber(value: string | undefined | null): string {
    return maskAccountNumber(value);
  }

  // ---- Payment-detail retry (fixes the "not showing yet" flash) --------

  private beginPaymentDetailRetry(): void {
    if (this.paymentDetailRetryTimer) {
      clearTimeout(this.paymentDetailRetryTimer);
      this.paymentDetailRetryTimer = null;
    }
    this.paymentDetailRetryAttempt = 0;
    this.paymentDetailRetrying = true;
    this.attemptPaymentDetailFetch();
  }

  private attemptPaymentDetailFetch(): void {
    if (!this.trade) {
      this.paymentDetailRetrying = false;
      return;
    }

    this.refreshingTrade = true;
    this.p2pService.getTrade(this.trade.id).subscribe({
      next: (updated) => {
        this.refreshingTrade = false;
        this.trade = updated;

        if (this.resolvedPaymentDetail) {
          this.paymentDetailRetrying = false;
          return;
        }

        this.paymentDetailRetryAttempt += 1;
        if (this.paymentDetailRetryAttempt >= PAYMENT_DETAIL_RETRY_MAX) {
          this.paymentDetailRetrying = false;
          return;
        }

        this.paymentDetailRetryTimer = setTimeout(
          () => this.attemptPaymentDetailFetch(),
          PAYMENT_DETAIL_RETRY_DELAY_MS
        );
      },
      error: () => {
        this.refreshingTrade = false;
        this.paymentDetailRetryAttempt += 1;
        if (this.paymentDetailRetryAttempt >= PAYMENT_DETAIL_RETRY_MAX) {
          this.paymentDetailRetrying = false;
          return;
        }
        this.paymentDetailRetryTimer = setTimeout(
          () => this.attemptPaymentDetailFetch(),
          PAYMENT_DETAIL_RETRY_DELAY_MS
        );
      },
    });
  }

  /** Manual retry, wired to the "Refresh" button in the warning banner. */
  retryPaymentDetail(): void {
    if (this.refreshingTrade || this.paymentDetailRetrying) return;
    this.beginPaymentDetailRetry();
  }

  // =======================================================================
  // TRADE DETAIL — mark paid / auto-verify / auto-release / manual release
  // =======================================================================

  get canMarkPaid(): boolean {
    return !!this.trade && canMarkPaid(this.trade) && !this.countdownExpired;
  }

  get canReleaseFunds(): boolean {
    return !!this.trade && canReleaseFunds(this.trade);
  }

  /** Manual release stays available as a fallback while we wait on
   *  auto-verification, or for trades that aren't auto-release eligible. */
  get canManuallyRelease(): boolean {
    return this.canReleaseFunds && this.verificationStatus !== 'verified' && !this.autoReleaseInFlight;
  }

  get canCancel(): boolean {
    return !!this.trade && canCancelTrade(this.trade) && !this.isPaymentExpired;
  }

  get releasePinValid(): boolean {
    return PIN_PATTERN.test(this.releasePin);
  }

  get releasePinLocked(): boolean {
    return this.releasePinLockedUntil > this.nowTick;
  }

  get releasePinLockLabel(): string {
    return formatCountdown(Math.max(0, this.releasePinLockedUntil - this.nowTick));
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
      this.proofUrl = reader.result as string;
    };
    reader.onerror = () => {
      this.proofFileError = 'Could not read that file, please try again.';
    };
    reader.readAsDataURL(file);
  }

  submitMarkPaid(): void {
    if (!this.trade || this.markingPaid) return;
    if (this.countdownExpired) {
      this.proofFileError = 'The payment window has expired. Refresh this trade before continuing.';
      return;
    }
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

          // Kick off auto-verification so we can auto-release the moment
          // the backend confirms the payment genuinely landed.
          if (updated.autoReleaseEligible) {
            this.startVerificationPolling();
          }
        },
        error: (err) => {
          this.markingPaid = false;
          const message = err?.error?.message || 'Could not mark this trade as paid.';
          this.proofFileError = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  // ---- Auto-verification polling -----------------------------------

  private startVerificationPolling(): void {
    if (!this.trade) return;
    this.stopVerificationPolling();
    this.verificationStatus = 'pending';
    this.verificationPollStartedAt = Date.now();

    this.verificationPollTimer = setInterval(() => this.pollVerification(), VERIFICATION_POLL_INTERVAL_MS);
    // Fire the first check immediately instead of waiting a full interval.
    this.pollVerification();
  }

  private stopVerificationPolling(): void {
    if (this.verificationPollTimer) {
      clearInterval(this.verificationPollTimer);
      this.verificationPollTimer = null;
    }
  }

  private pollVerification(): void {
    if (!this.trade) {
      this.stopVerificationPolling();
      return;
    }

    // Stop trying to auto-verify a trade that already moved on
    // (released, cancelled, disputed) via some other path.
    if (this.trade.status !== TradeStatus.Paid) {
      this.stopVerificationPolling();
      return;
    }

    if (Date.now() - this.verificationPollStartedAt > VERIFICATION_POLL_TIMEOUT_MS) {
      this.verificationStatus = 'timed-out';
      this.stopVerificationPolling();
      this.sharedService.showToast({
        title: 'Automatic verification is taking longer than usual. You can release manually once you confirm payment.',
      });
      return;
    }

    this.p2pService.verifyPayment(this.trade.id).subscribe({
      next: (res) => {
        this.verificationStatus = res.status;
        if (res.trade) this.trade = res.trade;

        if (res.status === 'verified') {
          this.stopVerificationPolling();
          this.autoRelease();
        } else if (res.status === 'failed') {
          this.stopVerificationPolling();
          this.sharedService.showToast({
            title: 'We could not automatically verify this payment. Please release manually once you confirm the funds arrived.',
          });
        }
      },
      error: () => {
        // Transient poll errors are ignored; the next tick will retry.
      },
    });
  }


  private autoRelease(): void {
    if (!this.trade || this.autoReleaseInFlight) return;
    this.autoReleaseInFlight = true;

    this.p2pService.autoReleaseTrade(this.trade.id).subscribe({
      next: (updated) => {
        this.autoReleaseInFlight = false;
        this.trade = updated;
        this.sharedService.showToast({
          title: 'Payment verified automatically. Funds have been released to the buyer.',
        });
      },
      error: (err) => {
        this.autoReleaseInFlight = false;
        this.verificationStatus = 'failed';
        const message = err?.error?.message || 'Payment was verified but the automatic release failed. Please release manually.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  get verificationStatusLabel(): string {
    switch (this.verificationStatus) {
      case 'pending':
        return 'Waiting for payment confirmation…';
      case 'verifying':
        return 'Verifying payment with the payment provider…';
      case 'verified':
        return 'Payment verified — releasing funds…';
      case 'failed':
        return 'Automatic verification failed. You can release manually.';
      case 'timed-out':
        return 'Still waiting on verification. You can release manually if you have confirmed the funds yourself.';
      default:
        return '';
    }
  }

  get showAutoVerificationBanner(): boolean {
    return this.verificationStatus !== 'idle' && this.trade?.status === TradeStatus.Paid;
  }

  // ---- Manual release (fallback path) --------------------------------

  confirmReleaseFunds(): void {
    if (!this.trade || this.releasing) return;

    this.releasePinError = '';
    if (this.releasePinLocked) {
      this.releasePinError = `Too many attempts. Try again in ${this.releasePinLockLabel}.`;
      return;
    }
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
        this.releasePinAttempts = 0;
        this.trade = updated;
        this.stopVerificationPolling();
        this.sharedService.showToast({ title: 'Payment confirmed. Coins released to the buyer.' });
      },
      error: (err) => {
        this.releasing = false;
        this.releasePin = '';
        this.releasePinAttempts += 1;
        if (this.releasePinAttempts >= MAX_PIN_ATTEMPTS) {
          this.releasePinLockedUntil = Date.now() + PIN_LOCKOUT_MS;
          this.releasePinAttempts = 0;
        }
        const message = err?.error?.message || 'Could not release this trade.';
        this.releasePinError = Array.isArray(message) ? message.join(', ') : message;
      },
    });
  }

  cancelTrade(): void {
    if (!this.trade || this.cancelling || !this.canCancel) return;
    const confirmed = window.confirm(
      'Cancel this trade? Only do this if you have not sent payment — cancelling after paying can delay resolution.'
    );
    if (!confirmed) return;

    this.cancelling = true;
    this.p2pService.cancelTrade(this.trade.id).subscribe({
      next: (updated) => {
        this.cancelling = false;
        this.trade = updated;
        this.stopVerificationPolling();
        this.sharedService.showToast({ title: 'Trade cancelled.' });
      },
      error: (err) => {
        this.cancelling = false;
        const message = err?.error?.message || 'Could not cancel this trade.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
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
        this.stopVerificationPolling();
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

  copyToClipboard(value: string, field: string): void {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      this.copiedField = field;
      if (this.copiedResetTimer) clearTimeout(this.copiedResetTimer);
      this.copiedResetTimer = setTimeout(() => (this.copiedField = null), 1500);
    });
  }
}