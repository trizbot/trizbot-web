import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { SignalsService } from '../signals.service';
import { SignalItem, SignalTypeEnum } from '../model/signal.model';

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
  readonly signalTypes = Object.values(SignalTypeEnum);

  saving = false;

  form = new FormGroup({
    pair: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
    type: new FormControl<SignalTypeEnum>(SignalTypeEnum.Buy, { nonNullable: true, validators: [Validators.required] }),
    entryPrice: new FormControl<number | null>(null, { validators: [Validators.required] }),
    targetPrice: new FormControl<number | null>(null),
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
        pair: item.pair,
        type: item.type,
        entryPrice: item.entryPrice,
        targetPrice: item.targetPrice ?? null,
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
      pair: raw.pair.trim().toUpperCase(),
      type: raw.type,
      entryPrice: raw.entryPrice as number,
      targetPrice: raw.targetPrice ?? undefined,
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