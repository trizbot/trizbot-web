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

/** Direction relative to the logged-in member. `null` = identity unresolved. */
type Direction = 'debit' | 'credit' | null;

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

  @Input() currentUserId?: string;
  @Input() currentUserEmail?: string;

  transferForm = new FormGroup({
    recipientIdentifier: new FormControl('', [Validators.required, Validators.minLength(3)]),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    narration: new FormControl('', [Validators.maxLength(500)]),
    transactionPin: new FormControl('', [Validators.required, Validators.minLength(4)]),

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

  /** Whether we were able to resolve who's logged in — drives a UI warning if false. */
  identityResolved = false;

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
        if (res) {
          const name = this.beneficiaryDisplayName;
          if (name === this.lastTypedIdentifier) {
           
          }
        }
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
   * Resolves the logged-in member's id/email so history rows can be
   * attributed correctly. Tries, in order:
   *  1. @Input()s passed from the parent (preferred — wire these up if possible)
   *  2. localStorage 'userId' / 'user' JSON blob
   *  3. A decoded JWT in localStorage under a common key name
   */
  private resolveCurrentUser(): void {
    if (this.currentUserId || this.currentUserEmail) {
      this.identityResolved = true;
      return;
    }

    try {
      const storedId = localStorage.getItem('userId');
      if (storedId) {
        this.currentUserId = storedId;
      }

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        this.currentUserId =
          this.currentUserId || parsed?.id || parsed?._id || parsed?.userId || parsed?.entityId;
        this.currentUserEmail = parsed?.email || parsed?.userEmail;
      }
    } catch {
      // Malformed/absent 'user' blob — fall through to JWT attempt below.
    }

    if (!this.currentUserId && !this.currentUserEmail) {
      this.tryResolveFromJwt();
    }

    this.identityResolved = !!(this.currentUserId || this.currentUserEmail);

    if (!this.identityResolved) {
      
    }
  }

  /** Attempts to pull sub/email claims out of a JWT stored under a common key name. */
  private tryResolveFromJwt(): void {
    const tokenKeys = ['token', 'accessToken', 'access_token', 'authToken', 'jwt'];
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (!token) {
        continue;
      }
      const payload = this.decodeJwtPayload(token);
      if (!payload) {
        continue;
      }
      this.currentUserId = payload.id || payload.sub || payload.userId || payload._id;
      this.currentUserEmail = payload.email;
      if (this.currentUserId || this.currentUserEmail) {
        return;
      }
    }
  }

  private decodeJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
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

  /**
   * Direction relative to the current member.
   * 'debit'  => current member was the SENDER   (-$amount, red)
   * 'credit' => current member was the RECEIVER (+$amount, green)
   * null     => identity unresolved — render as neutral, never guess.
   */
  direction(item: TransferHistoryItem): Direction {
    const senderId = this.extractId(item.senderId);
    if (this.currentUserId && senderId) {
      return senderId === this.currentUserId ? 'debit' : 'credit';
    }
    if (this.currentUserEmail && item.senderEmail) {
      return item.senderEmail.toLowerCase() === this.currentUserEmail.toLowerCase() ? 'debit' : 'credit';
    }
    return null;
  }

  isDebit(item: TransferHistoryItem): boolean {
    return this.direction(item) === 'debit';
  }

  isCredit(item: TransferHistoryItem): boolean {
    return this.direction(item) === 'credit';
  }

  counterpartyName(item: TransferHistoryItem): string {
    const dir = this.direction(item);
    if (dir === 'debit') return item.receiverName;
    if (dir === 'credit') return item.senderName;
    // Unresolved — show both so nothing is misattributed.
    return `${item.senderName} → ${item.receiverName}`;
  }

  counterpartyEmail(item: TransferHistoryItem): string {
    const dir = this.direction(item);
    if (dir === 'debit') return item.receiverEmail;
    if (dir === 'credit') return item.senderEmail;
    return '';
  }

  /** Signed, formatted amount string, e.g. "-$50.00" / "+$50.00" / "$50.00". */
  counterpartyAmount(item: TransferHistoryItem): string {
    const dir = this.direction(item);
    const sign = dir === 'debit' ? '-' : dir === 'credit' ? '+' : '';
    return `${sign}$${item.amount.toFixed(2)}`;
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
    return [];
  }

  /** Tracks the raw text the user typed, used as the last-resort display fallback. */
  private get lastTypedIdentifier(): string {
    return (this.transferForm.controls.recipientIdentifier.value || '').trim();
  }

 get beneficiaryInitials(): string {
    const first = this.beneficiary?.firstName?.trim()?.charAt(0) ?? '';
    const last = this.beneficiary?.lastName?.trim()?.charAt(0) ?? '';
    const initials = (first + last).toUpperCase();
    if (initials) {
      return initials;
    }
    const name = this.beneficiaryDisplayName;
    if (!name) {
      return '?';
    }
    // "Rachel Lucky" -> "RL"; single-word names -> first letter only.
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
      : parts[0].charAt(0).toUpperCase();
  }

  get beneficiaryDisplayName(): string {
    const b = this.beneficiary;
    if (!b) {
      return '';
    }

    // Primary shape returned by /transfer/lookup-beneficiary: { name, username, entityId }.
    if (b.name?.trim()) {
      return b.name.trim();
    }

    // Fallbacks for other possible response shapes / endpoints.
    const first = b.firstName?.trim() ?? '';
    const last = b.lastName?.trim() ?? '';
    const full = `${first} ${last}`.trim();
    if (full) {
      return full;
    }
    if (b.fullName?.trim()) return b.fullName.trim();
    if (b.displayName?.trim()) return b.displayName.trim();
    if (b.userName?.trim()) return b.userName.trim();
    if (b.username?.trim()) return b.username.trim();
    if (b.email?.trim()) return b.email.trim();

    return this.lastTypedIdentifier || 'Recipient';
  }


  get stepIndex(): number {
    return this.steps.findIndex((s) => s.key === this.currentStep);
  }

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
    const recipientName = this.beneficiaryDisplayName;

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
            title: `Transfer of $${amount} to ${recipientName} was successful`,
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