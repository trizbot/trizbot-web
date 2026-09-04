import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../service/p2p.service';
import { P2PTrade, DisputeResolution, fiatSymbol, maskAccountNumber } from '../model/p2p.model';

export interface DisputeResolutionDialogData {
  trade: P2PTrade;
}

@Component({
  selector: 'app-dispute-resolution-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './dispute-resolution-dialog.component.html',
  styleUrls: ['./dispute-resolution-dialog.component.scss'],
})
export class DisputeResolutionDialogComponent {
  readonly DisputeResolution = DisputeResolution;

  trade: P2PTrade;
  adminNote = '';
  resolving: DisputeResolution | null = null;
  errorMessage = '';

  constructor(
    private dialogRef: MatDialogRef<DisputeResolutionDialogComponent>,
    private p2pService: P2pService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: DisputeResolutionDialogData
  ) {
    this.trade = data.trade;
  }

  close(result?: P2PTrade): void {
    this.dialogRef.close(result);
  }

  tradeFiatSymbol(): string {
    return fiatSymbol(this.trade.order?.fiatCurrency);
  }

  maskedAccountNumber(value: string | undefined | null): string {
    return maskAccountNumber(value);
  }

  looksLikeImage(url: string | undefined | null): boolean {
    if (!url) return false;
    return /\.(png|jpe?g|gif|webp)($|\?)/i.test(url) || url.startsWith('data:image/');
  }

  resolve(resolution: DisputeResolution): void {
    if (this.resolving) return;

    const label =
      resolution === DisputeResolution.ReleaseToBuyer
        ? `release ${this.trade.coinAmount} ${this.trade.order?.coin || ''} to the buyer (@${this.trade.buyer.username})`
        : `refund ${this.trade.coinAmount} ${this.trade.order?.coin || ''} to the seller (@${this.trade.seller.username})`;

    const confirmed = window.confirm(
      `You are about to ${label}. This is based on your review of the submitted evidence and cannot be undone. Continue?`
    );
    if (!confirmed) return;

    this.errorMessage = '';
    this.resolving = resolution;

    this.p2pService
      .resolveDispute({
        tradeId: this.trade.id,
        resolution,
        note: this.adminNote.trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.resolving = null;
          this.sharedService.showToast({
            title:
              resolution === DisputeResolution.ReleaseToBuyer
                ? 'Funds released to the buyer.'
                : 'Funds refunded to the seller.',
          });
          this.close(updated);
        },
        error: (err) => {
          this.resolving = null;
          const message = err?.error?.message || 'Could not resolve this dispute right now.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }
}