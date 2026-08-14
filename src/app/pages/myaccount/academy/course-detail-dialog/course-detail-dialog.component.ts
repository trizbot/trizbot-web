import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { Course } from '../model/academy.model';

export interface CourseDetailDialogData {
  course: Course;
  /** Whether the current user already owns this course (unlocks content + download). */
  isPurchased?: boolean;
}

export type CourseDetailDialogResult = { action: 'purchase' } | { action: 'download' } | undefined;

@Component({
  selector: 'app-course-detail-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './course-detail-dialog.component.html',
  styleUrls: ['./course-detail-dialog.component.scss'],
})
export class CourseDetailDialogComponent {
  course: Course;
  isPurchased: boolean;

  constructor(
    public dialogRef: MatDialogRef<CourseDetailDialogComponent, CourseDetailDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: CourseDetailDialogData,
  ) {
    this.course = data.course;
    this.isPurchased = !!data.isPurchased;
  }

  get hasFile(): boolean {
    return !!(this.course.pdfUrl || this.course.attachmentUrl);
  }

  get isFree(): boolean {
    return !this.course.price;
  }

  /** Content is only shown in full once it's free or the user owns it. */
  get canViewFullContent(): boolean {
    return this.isFree || this.isPurchased;
  }

  initials(): string {
    const f = this.course.instructor.firstName?.charAt(0) || '';
    const l = this.course.instructor.lastName?.charAt(0) || '';
    return (f + l).toUpperCase() || '?';
  }

  close(): void {
    this.dialogRef.close();
  }

  purchase(): void {
    this.dialogRef.close({ action: 'purchase' });
  }

  download(): void {
    this.dialogRef.close({ action: 'download' });
  }
}