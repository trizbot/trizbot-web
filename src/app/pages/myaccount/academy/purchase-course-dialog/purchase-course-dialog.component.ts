// purchase-course-dialog/purchase-course-dialog.component.ts

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

@Component({
  selector: 'app-purchase-course-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './purchase-course-dialog.component.html',
  styleUrls: ['./purchase-course-dialog.component.scss'],
})
export class PurchaseCourseDialogComponent {
  course: Course;
  loading = false;
  errorMessage = '';

  form = new FormGroup({
    transactionPin: new FormControl('', [Validators.required, Validators.minLength(4)]),
    reference: new FormControl({ value: '', disabled: true }, [Validators.required]),
  });

  constructor(
    private dialogRef: MatDialogRef<PurchaseCourseDialogComponent>,
    private academyService: AcademyService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseCourseDialogData
  ) {
    this.course = data.course;
    this.generateReference();
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
    const { transactionPin, reference } = this.form.getRawValue();

    this.academyService
      .purchaseCourse({
        courseId: this.course.id,
        transactionPin: transactionPin!,
        reference: reference!,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          const message = err?.error?.message || 'Could not complete this purchase. Please try again.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}