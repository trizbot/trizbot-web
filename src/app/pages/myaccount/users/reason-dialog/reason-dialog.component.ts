import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ReasonDialogData {
  title: string;
  actionLabel: string;
  userDisplayName: string;
  danger?: boolean;
}

export interface ReasonDialogResult {
  reason: string;
}

@Component({
  selector: 'app-reason-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">{{ data.title }}</h2>

    <div mat-dialog-content>
      <p class="subject-line">{{ data.userDisplayName }}</p>

      <form [formGroup]="form" class="reason-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reason</mat-label>
          <textarea
            matInput
            rows="4"
            formControlName="reason"
            maxlength="500"
            placeholder="Explain why this action is being taken"
          ></textarea>
          <mat-hint align="end">{{ form.value.reason?.length || 0 }}/500</mat-hint>
          <mat-error *ngIf="form.controls['reason'].hasError('required')">
            A reason is required
          </mat-error>
        </mat-form-field>
      </form>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button
        mat-raised-button
        [color]="data.danger ? 'warn' : 'primary'"
        [disabled]="form.invalid"
        (click)="submit()"
      >
        {{ data.actionLabel }}
      </button>
    </div>
  `,
  styles: [
    `
      .dialog-title {
        font-size: 1.25rem;
        font-weight: 600;
      }
      .subject-line {
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 16px;
        color: rgba(0, 0, 0, 0.75);
      }
      .reason-form {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .full-width {
        width: 100%;
      }
      textarea {
        font-size: 0.95rem;
      }
    `,
  ],
})
export class ReasonDialogComponent {
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ReasonDialogComponent, ReasonDialogResult>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: ReasonDialogData
  ) {
    this.form = this.fb.group({
      reason: ['', [Validators.required, Validators.maxLength(500)]],
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.dialogRef.close({ reason: this.form.value.reason });
  }
}