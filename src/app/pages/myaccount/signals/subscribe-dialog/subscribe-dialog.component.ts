import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { SignalsService } from '../signals.service';
import { PLAN_LABELS, PlanOption } from '../model/signal.model';

export interface SubscribeDialogData {
  plan: PlanOption;
}

@Component({
  selector: 'app-subscribe-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './subscribe-dialog.component.html',
  styleUrls: ['./subscribe-dialog.component.scss'],
})

export class SubscribeDialogComponent {
  readonly planLabels = PLAN_LABELS;

  saving = false;

  form = new FormGroup({
    transactionPin: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(6)],
    }),
  });

  constructor(
    private dialogRef: MatDialogRef<SubscribeDialogComponent>,
    private signalsService: SignalsService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: SubscribeDialogData
  ) {}

  close(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const reference = `SUB-${this.data.plan.plan.toUpperCase()}-${Date.now()}`;

    this.signalsService
      .subscribe({
        plan: this.data.plan.plan,
        transactionPin: this.form.getRawValue().transactionPin,
        reference,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.sharedService.showToast({
            title: err?.error?.message || 'Could not complete subscription.',
          });
        },
      });
  }
}