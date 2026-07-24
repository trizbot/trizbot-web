
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { ArbitrageService } from '../arbitrage.service';
import { ArbitrageOpportunity, EXCHANGE_CONFIG } from '../model/arbitrage.model';

export interface PlaceTradeDialogData {
  opportunity: ArbitrageOpportunity;
  activeExchange: string;
}

@Component({
  selector: 'app-place-trade-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './place-trade-dialog.component.html',
  styleUrls: ['./place-trade-dialog.component.scss'],
})
export class PlaceTradeDialogComponent {
  readonly exchangeConfig = EXCHANGE_CONFIG;
  opportunity: ArbitrageOpportunity;

  loading = false;
  errorMessage = '';

  form = new FormGroup({
    quoteAmount: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
  });

  constructor(
    private dialogRef: MatDialogRef<PlaceTradeDialogComponent>,
    private arbitrageService: ArbitrageService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: PlaceTradeDialogData
  ) {
    this.opportunity = data.opportunity;
  }

  get buyConfig() {
    return this.exchangeConfig[this.opportunity.buyExchange];
  }

  get sellConfig() {
    return this.exchangeConfig[this.opportunity.sellExchange];
  }

  get estimatedCoinAmount(): number {
    const amount = this.form.getRawValue().quoteAmount;
    if (!amount || !this.opportunity.buyPrice) return 0;
    return amount / this.opportunity.buyPrice;
  }

  get estimatedProfit(): number {
    const amount = this.form.getRawValue().quoteAmount;
    if (!amount) return 0;
    return (amount * this.opportunity.spreadPercent) / 100;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    const { quoteAmount } = this.form.getRawValue();

    this.arbitrageService
      .placeTrade({
        token: this.opportunity.token,
        buyExchange: this.opportunity.buyExchange,
        sellExchange: this.opportunity.sellExchange,
        quoteAmount: quoteAmount!,
        expectedMinSpreadPercent: this.opportunity.spreadPercent,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          const message = err?.error?.message || 'Could not execute this trade. Please try again.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}