import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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

import { SharedService } from '../../../shared/shared.service';
import { TransferService } from './transfer.service';
import { BeneficiaryLookupResBody, TransferHistoryItem } from './transfer.type';

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
  ],
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.scss'],
})
export class TransferComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private destroy$ = new Subject<void>();

  transferForm = new FormGroup({
    recipientIdentifier: new FormControl('', [Validators.required, Validators.minLength(3)]),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    transactionPin: new FormControl('', [Validators.required, Validators.minLength(4)]),
    reference: new FormControl({ value: '', disabled: true }, [Validators.required]),
    narration: new FormControl('', [Validators.maxLength(500)]),
  });

  beneficiary: BeneficiaryLookupResBody | null = null;
  lookupLoading = false;
  lookupError = '';

  submitLoading = false;
  errorMessage = '';

  historyLoading = false;
  history: TransferHistoryItem[] = [];

  constructor(private transferService: TransferService) {}

  ngOnInit(): void {
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

  generateReference(): void {
    const ref = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    this.transferForm.controls.reference.setValue(ref);
  }

  loadHistory(): void {
    this.historyLoading = true;
    this.transferService.getTransferHistory().subscribe({
      next: (res) => {
        this.history = res;
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
      },
    });
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
            title: `Transfer of ${amount} to ${this.beneficiary?.firstName} ${this.beneficiary?.lastName} was successful`,
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
      transactionPin: '',
      reference: '',
      narration: '',
    });
    this.beneficiary = null;
    this.generateReference();
  }
}