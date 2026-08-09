import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { SignalsService } from '../signals.service';
import { SignalCategoryEnum, SignalItem } from '../model/signal.model';

export interface SignalFormDialogData {
  mode: 'create' | 'edit';
  item?: SignalItem;
}

@Component({
  selector: 'app-signal-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './signal-form-dialog.component.html',
  styleUrls: ['./signal-form-dialog.component.scss'],
})
export class SignalFormDialogComponent implements OnInit {
  readonly categories = Object.values(SignalCategoryEnum);

  saving = false;

  form = new FormGroup({
    category: new FormControl<SignalCategoryEnum | null>(null, {
      validators: [Validators.required],
    }),
    pair: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    entryPrice: new FormControl<number | null>(null, { validators: [Validators.required] }),
    takeProfit1: new FormControl<number | null>(null),
    takeProfit2: new FormControl<number | null>(null),
    takeProfit3: new FormControl<number | null>(null),
    stopLoss: new FormControl<number | null>(null),
    analysis: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  constructor(
    private dialogRef: MatDialogRef<SignalFormDialogComponent>,
    private signalsService: SignalsService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: SignalFormDialogData
  ) {}

  ngOnInit(): void {
    if (this.isEdit && this.data.item) {
      const item = this.data.item;
      this.form.patchValue({
        category: item.category,
        pair: item.pair,
        entryPrice: item.entryPrice,
        takeProfit1: item.takeProfit1 ?? null,
        takeProfit2: item.takeProfit2 ?? null,
        takeProfit3: item.takeProfit3 ?? null,
        stopLoss: item.stopLoss ?? null,
        analysis: item.analysis || '',
      });
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const raw = this.form.getRawValue();

    const payload = {
      category: raw.category as SignalCategoryEnum,
      pair: raw.pair.trim().toUpperCase(),
      entryPrice: raw.entryPrice as number,
      // Only send TP levels the admin actually filled in — TP1 can be
      // set alone, or any combination of TP1/TP2/TP3.
      takeProfit1: raw.takeProfit1 ?? undefined,
      takeProfit2: raw.takeProfit2 ?? undefined,
      takeProfit3: raw.takeProfit3 ?? undefined,
      stopLoss: raw.stopLoss ?? undefined,
      analysis: raw.analysis?.trim() || undefined,
    };

    const request$ =
      this.isEdit && this.data.item
        ? this.signalsService.updateSignal(this.data.item.id, payload)
        : this.signalsService.createSignal(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.sharedService.showToast({
          title: err?.error?.message || 'Could not save signal.',
        });
      },
    });
  }
}