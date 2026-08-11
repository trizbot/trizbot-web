import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { of } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SharedService } from '../../../shared/shared.service';
import { TransferService } from './transfer.service';
import { BeneficiaryLookupResBody, MongoDate, MongoObjectId, TransferHistoryItem } from './transfer.type';

type TransferStep = 'recipient' | 'details' | 'confirm';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.scss'],
})
export class TransferComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private destroy$ = new Subject<void>();

  /** Ordered steps for the wallet transfer wizard. */
  readonly steps: { key: TransferStep; label: string }[] = [
    { key: 'recipient', label: 'Recipient' },
    { key: 'details', label: 'Amount' },
    { key: 'confirm', label: 'Confirm' },
  ];
  currentStep: TransferStep = 'recipient';

  /**
   * Identity of the logged-in member, used to work out whether a given
   * history row was money going out (they were the sender) or coming in
   * (they were the receiver). Pass these in from the parent/auth store —
   * `resolveCurrentUser()` below only falls back to localStorage as a
   * last resort if neither is supplied.
   */
  @Input() currentUserId?: string;
  @Input() currentUserEmail?: string;

  transferForm = new FormGroup({
    recipientIdentifier: new FormControl('', [Validators.required, Validators.minLength(3)]),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    narration: new FormControl('', [Validators.maxLength(500)]),
    transactionPin: new FormControl('', [Validators.required, Validators.minLength(4)]),
    // Generated internally and sent with the request. Intentionally kept out of
    // the template entirely: members never see or edit a transfer reference.
    reference: new FormControl({ value: '', disabled: true }, [Validators.required]),
  });

  beneficiary: BeneficiaryLookupResBody | null = null;
  lookupLoading = false;
  lookupError = '';

  submitLoading = false;
  errorMessage = '';

  pinVisible = false;

  historyLoading = false;
  history: TransferHistoryItem[] = [];

  constructor(private transferService: TransferService) {}

  ngOnInit(): void {
    this.resolveCurrentUser();
    this.generateReference();
    this.loadHistory();

    this.transferForm.controls.recipientIdentifier.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((value) => {
          this.beneficiary = null;
          this.lookupError = '';
          if (!value || value.trim().length < 3) {
            this.lookupLoading = false;
          }
        }),
        switchMap((value) => {
          if (!value || value.trim().length < 3) {
            return of(null);
          }
          this.lookupLoading = true;
          return this.transferService.lookupBeneficiary(value.trim()).pipe(
            catchError(() => {
              this.lookupError = 'No user found with that username or email.';
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        this.lookupLoading = false;
        this.beneficiary = res;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePinVisibility(): void {
    this.pinVisible = !this.pinVisible;
  }

  generateReference(): void {
    const ref = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    this.transferForm.controls.reference.setValue(ref);
  }

  /**
   * Best-effort fallback if the parent didn't pass currentUserId/currentUserEmail
   * as @Inputs. Adjust the storage keys here to match your actual auth service —
   * this is only a safety net, not the source of truth.
   */
  private resolveCurrentUser(): void {
    if (this.currentUserId || this.currentUserEmail) {
      return;
    }
    try {
      const storedId = localStorage.getItem('userId');
      if (storedId) {
        this.currentUserId = storedId;
        return;
      }
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        this.currentUserId = parsed?.id || parsed?._id || parsed?.userId;
        this.currentUserEmail = parsed?.email;
      }
    } catch {
      // Malformed/absent storage — direction falls back to "outgoing" per row.
    }
  }

  /** Unwraps a plain string or a Mongo `{ $oid }` extended-JSON id. */
  private extractId(value: string | MongoObjectId | undefined | null): string {
    if (!value) {
      return '';
    }
    return typeof value === 'string' ? value : value.$oid;
  }

  /** Unwraps a plain ISO string or a Mongo `{ $date }` extended-JSON date. */
  private extractDate(value: string | MongoDate | undefined | null): Date | null {
    if (!value) {
      return null;
    }
    const raw = typeof value === 'string' ? value : value.$date;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /** True when the current member was the sender on this transfer (money out). */
  isOutgoing(item: TransferHistoryItem): boolean {
    const senderId = this.extractId(item.senderId);
    if (this.currentUserId && senderId) {
      return senderId === this.currentUserId;
    }
    if (this.currentUserEmail && item.senderEmail) {
      return item.senderEmail.toLowerCase() === this.currentUserEmail.toLowerCase();
    }
    // Identity unresolved — default to outgoing so the row still renders
    // sensibly; wire up currentUserId/currentUserEmail to fix this properly.
    return true;
  }

  counterpartyName(item: TransferHistoryItem): string {
    return this.isOutgoing(item) ? item.receiverName : item.senderName;
  }

  counterpartyEmail(item: TransferHistoryItem): string {
    return this.isOutgoing(item) ? item.receiverEmail : item.senderEmail;
  }

  historyDate(item: TransferHistoryItem): Date | null {
    return this.extractDate(item.createdAt);
  }

  /** Normalizes backend status strings (e.g. "Completed") to the pill's CSS classes. */
  statusClass(item: TransferHistoryItem): 'success' | 'pending' | 'failed' {
    const status = (item.status || '').toLowerCase();
    if (status === 'completed' || status === 'success') {
      return 'success';
    }
    if (status === 'failed' || status === 'declined' || status === 'reversed') {
      return 'failed';
    }
    return 'pending';
  }

  loadHistory(): void {
    this.historyLoading = true;
    this.transferService.getTransferHistory().subscribe({
      next: (res) => {
        this.history = this.normalizeHistoryResponse(res);
        this.historyLoading = false;
      },
      error: () => {
        this.history = [];
        this.historyLoading = false;
      },
    });
  }

  /**
   * The history endpoint has been observed returning a bare array in some
   * environments and a wrapped payload (e.g. `{ data: [...] }`) in others.
   * Normalizing here means the template's `history.length` checks never see
   * `undefined` and silently render nothing — pin down the real shape on the
   * backend and this can be simplified back to `res as TransferHistoryItem[]`.
   */
  private normalizeHistoryResponse(res: unknown): TransferHistoryItem[] {
    if (Array.isArray(res)) {
      return res as TransferHistoryItem[];
    }
    if (res && typeof res === 'object') {
      const candidate = res as Record<string, unknown>;
      for (const key of ['data', 'transfers', 'history', 'items', 'results']) {
        if (Array.isArray(candidate[key])) {
          return candidate[key] as TransferHistoryItem[];
        }
      }
    }
    console.warn('Unexpected transfer history response shape:', res);
    return [];
  }

  /** Initials for the avatar circle. Falls back to a generic mark if the API omitted name fields. */
  get beneficiaryInitials(): string {
    const first = this.beneficiary?.firstName?.trim()?.charAt(0) ?? '';
    const last = this.beneficiary?.lastName?.trim()?.charAt(0) ?? '';
    return (first + last).toUpperCase() || '?';
  }

  /** Display name for the beneficiary. Falls back to username, then a generic label. */
  get beneficiaryDisplayName(): string {
    const first = this.beneficiary?.firstName?.trim() ?? '';
    const last = this.beneficiary?.lastName?.trim() ?? '';
    const full = `${first} ${last}`.trim();
    if (full) {
      return full;
    }
    return this.beneficiary?.userName?.trim() || full||'Member';
  }

  get stepIndex(): number {
    return this.steps.findIndex((s) => s.key === this.currentStep);
  }

  /** Whether a given step is complete/reachable, used to render the step indicator. */
  isStepComplete(key: TransferStep): boolean {
    return this.steps.findIndex((s) => s.key === key) < this.stepIndex;
  }

  canLeaveRecipientStep(): boolean {
    return this.transferForm.controls.recipientIdentifier.valid && !!this.beneficiary;
  }

  canLeaveDetailsStep(): boolean {
    return this.transferForm.controls.amount.valid;
  }

  goToNextStep(): void {
    this.errorMessage = '';

    if (this.currentStep === 'recipient') {
      if (!this.canLeaveRecipientStep()) {
        this.transferForm.controls.recipientIdentifier.markAsTouched();
        if (!this.beneficiary) {
          this.errorMessage = 'Please select a valid recipient before continuing.';
        }
        return;
      }
      this.currentStep = 'details';
      return;
    }

    if (this.currentStep === 'details') {
      if (!this.canLeaveDetailsStep()) {
        this.transferForm.controls.amount.markAsTouched();
        return;
      }
      this.currentStep = 'confirm';
    }
  }

  goToPreviousStep(): void {
    this.errorMessage = '';
    if (this.currentStep === 'confirm') {
      this.currentStep = 'details';
    } else if (this.currentStep === 'details') {
      this.currentStep = 'recipient';
    }
  }

  /** Jump back to an earlier, already-completed step via the step indicator. */
  jumpToStep(key: TransferStep): void {
    if (this.isStepComplete(key)) {
      this.errorMessage = '';
      this.currentStep = key;
    }
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.transferForm.invalid || !this.beneficiary) {
      this.transferForm.markAllAsTouched();
      if (!this.beneficiary) {
        this.errorMessage = 'Please enter a valid recipient username or email.';
      }
      return;
    }

    this.submitLoading = true;
    const { recipientIdentifier, amount, transactionPin, reference, narration } =
      this.transferForm.getRawValue();

    this.transferService
      .transferFunds({
        recipientIdentifier: recipientIdentifier!,
        amount: amount!,
        transactionPin: transactionPin!,
        reference: reference!,
        narration: narration || undefined,
      })
      .subscribe({
        next: () => {
          this.sharedService.showToast({
            title: `Transfer of $${amount} to ${this.beneficiary?.firstName} ${this.beneficiary?.lastName} was successful`,
          });
          this.submitLoading = false;
          this.resetForm();
          this.loadHistory();
        },
        error: (err) => {
          const message = err?.error?.message || 'An unexpected error occurred.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
          this.submitLoading = false;
        },
      });
  }

  resetForm(): void {
    this.transferForm.reset({
      recipientIdentifier: '',
      amount: null,
      narration: '',
      transactionPin: '',
      reference: '',
    });
    this.pinVisible = false;
    this.beneficiary = null;
    this.currentStep = 'recipient';
    this.generateReference();
  }
}