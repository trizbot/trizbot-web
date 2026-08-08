import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { SignalsService } from '../signals.service';
import { MySubscription, PLAN_LABELS, PlanOption } from '../model/signal.model';
import { GetTraderResBody } from '../../../../../app/services/auth.type';
import { TraderService } from '../../../../../app/appstate/trader.service';

export interface SubscribeDialogData {
  plan: PlanOption;
}

const PIN_LENGTH = 4;

@Component({
  selector: 'app-subscribe-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './subscribe-dialog.component.html',
  styleUrls: ['./subscribe-dialog.component.scss'],
})
export class SubscribeDialogComponent implements OnInit {
  readonly planLabels = PLAN_LABELS;

  saving = false;
  errorMessage = '';

  /**
   * Member-facing wallet balance only. This dialog performs a standard
   * internal wallet transfer (debit member -> credit plan). There is no
   * gateway reference, transaction id, or payment rail exposed to the
   * member at any point in this flow — that detail is strictly server-side
   * bookkeeping and is intentionally never rendered here.
   */
  walletBalance = 0;
  walletLoading = true;

  form = new FormGroup({
    transactionPin: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(PIN_LENGTH),
        Validators.maxLength(PIN_LENGTH),
        Validators.pattern(/^\d+$/),
      ],
    }),
  });

  constructor(
    private dialogRef: MatDialogRef<SubscribeDialogComponent, MySubscription | null>,
    private signalsService: SignalsService,
    private sharedService: SharedService,
     private traderService: TraderService,
    @Inject(MAT_DIALOG_DATA) public data: SubscribeDialogData
  ) {}

  ngOnInit(): void {
    this.loadWalletBalance();
  }

  private loadWalletBalance(): void {
    this.walletLoading = true;
    this.traderService.getTrader().subscribe({
        next: (res: GetTraderResBody) => {
  
        this.walletBalance = Number(res.data.walletBalance);
        this.walletLoading = false;
      },
      error: (e) => {
        this.walletBalance = 0;
        this.walletLoading = false;
        this.sharedService.showToast({ title: `${e.message}`,});
      },
    });
  }

  get hasSufficientBalance(): boolean {
    return this.walletBalance >= this.data.plan.amount;
  }

  get balanceAfter(): number {
    return Math.max(this.walletBalance - this.data.plan.amount, 0);
  }

  get shortfall(): number {
    return Math.max(this.data.plan.amount - this.walletBalance, 0);
  }

  /** 0–100 fill for the balance meter, capped so an oversized balance doesn't overflow the bar. */
  get meterFillPercent(): number {
    if (this.data.plan.amount <= 0) return 0;
    const usedPortion = Math.min(this.walletBalance / this.data.plan.amount, 1.5);
    return Math.min((usedPortion / 1.5) * 100, 100);
  }

  close(): void {
    if (!this.saving) {
      this.dialogRef.close(null);
    }
  }

  confirm(): void {
    if (this.form.invalid || !this.hasSufficientBalance || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

  
    this.signalsService
      .subscribeWithWallet({
        plan: this.data.plan.plan,
        amount: this.data.plan.amount,
        transactionPin: this.form.getRawValue().transactionPin,
        reference: ''
      })
      .subscribe({
        next: (subscription) => {
          this.saving = false;
          this.dialogRef.close(subscription);
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = this.resolveError(err);
        },
      });
  }

  private resolveError(err: any): string {
    const code = err?.error?.code;
    switch (code) {
      case 'INVALID_PIN':
        return 'Incorrect transaction PIN. Please try again.';
      case 'INSUFFICIENT_BALANCE':
        this.loadWalletBalance();
        return 'Your wallet balance is no longer sufficient for this plan.';
      case 'PIN_LOCKED':
        return 'Your PIN has been locked after too many attempts. Contact support to reset it.';
      default:
        return err?.error?.message || 'Could not complete the transfer. Please try again.';
    }
  }

  fundWallet(): void {
    this.dialogRef.close(null);
    // Route to your wallet funding page/dialog, e.g.:
    // this.router.navigate(['/myaccount/wallet/fund']);
  }
}