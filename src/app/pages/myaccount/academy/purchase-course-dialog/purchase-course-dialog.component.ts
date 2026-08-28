import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { AcademyService } from '../academy.service';
import { Course } from '../model/academy.model';

export interface PurchaseCourseDialogData {
  course: Course;
}

const PIN_PATTERN = /^\d{4,6}$/;

@Component({
  selector: 'app-purchase-course-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './purchase-course-dialog.component.html',
  styleUrls: ['./purchase-course-dialog.component.scss'],
})
export class PurchaseCourseDialogComponent {
  course: Course;
  isFree: boolean;
  loading = false;
  errorMessage = '';

  form = new FormGroup({
    transactionPin: new FormControl('', [Validators.required, Validators.pattern(PIN_PATTERN)]),
    reference: new FormControl({ value: '', disabled: true }, [Validators.required]),
  });

  constructor(
    private dialogRef: MatDialogRef<PurchaseCourseDialogComponent>,
    private academyService: AcademyService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseCourseDialogData
  ) {
    this.course = data.course;
    this.isFree = !this.course?.price || this.course.price <= 0;

    this.generateReference();

    this.dialogRef.disableClose = false;
  }

  generateReference(): void {
    const ref = `CRS-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    this.form.controls.reference.setValue(ref);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    this.dialogRef.disableClose = true;

    const { transactionPin, reference } = this.form.getRawValue();

    this.academyService
      .purchaseCourse({
        courseId: this.course.id,
        reference: reference!,
        transactionPin: transactionPin!,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.disableClose = false;
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.dialogRef.disableClose = false;
          const message = err?.error?.message || 'Could not complete this purchase. Please try again.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;

          this.generateReference();
          this.form.controls.transactionPin.reset();
        },
      });
  }

  close(): void {
    if (this.loading) return;
    this.dialogRef.close(false);
  }
}