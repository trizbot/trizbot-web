import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgxDropzoneModule } from 'ngx-dropzone';

import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { MaterialModule } from '../../../../material.module';
import { AcademyService } from '../academy.service';
import {
  Course,
  CourseCategory,
  CourseCategoryItem,
  CourseLevel,
  CreateCourseReqBody,
  LEVEL_OPTIONS,
  UpdateCourseReqBody,
} from '../model/academy.model';

const MAX_COVER_PHOTO_SIZE_BYTES = 1 * 1024 * 1024; // 1MB, per spec
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — not specified, adjust this constant if you need a different cap
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_PDF_TYPE = 'application/pdf';

export interface CreateCourseDialogData {
  existing?: Course;
}

type UploadSlot = 'coverPhoto' | 'pdf';

@Component({
  selector: 'app-create-course-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, NgxDropzoneModule],
  templateUrl: './create-course-dialog.component.html',
  styleUrls: ['./create-course-dialog.component.scss'],
})
export class CreateCourseDialogComponent implements OnInit, OnDestroy {
  readonly levelOptions = LEVEL_OPTIONS;
  readonly maxContentLength = 20000;

  // Categories are now loaded from the backend instead of a static list.
  categories: CourseCategoryItem[] = [];
  categoriesLoading = false;

  loading = false;
  errorMessage = '';

  // ---- Cover photo ----
  coverPhotoFile: File | null = null;
  coverPhotoPreviewUrl: string | null = null;
  existingCoverPhotoUrl: string | null = null;

  // ---- PDF ----
  pdfFile: File | null = null;
  pdfFileName: string | null = null;
  existingPdfUrl: string | null = null;

  form = new FormGroup({
    title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string>(''),
    category: new FormControl<string>(''),
    level: new FormControl<string>(''),
    price: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    tags: new FormControl<string>(''),
    attachmentUrl: new FormControl<string>(''),
    content: new FormControl<string>('', { validators: [Validators.maxLength(this.maxContentLength)] }),
  });

  get isEditing(): boolean {
    return !!this.data.existing;
  }

  get contentLength(): number {
    return this.form.get('content')?.value?.length || 0;
  }

  get hasCoverPhoto(): boolean {
    return !!this.coverPhotoPreviewUrl || !!this.existingCoverPhotoUrl;
  }

  get coverPhotoDisplayUrl(): string | null {
    return this.coverPhotoPreviewUrl || this.existingCoverPhotoUrl;
  }

  get hasPdf(): boolean {
    return !!this.pdfFile || !!this.existingPdfUrl;
  }

  get pdfDisplayName(): string | null {
    return this.pdfFileName || (this.existingPdfUrl ? this.existingPdfUrl.split('/').pop() || 'Current PDF' : null);
  }

  constructor(
    private dialogRef: MatDialogRef<CreateCourseDialogComponent>,
    private academyService: AcademyService,
    @Inject(MAT_DIALOG_DATA) public data: CreateCourseDialogData
  ) {}

  ngOnInit(): void {
    if (this.isEditing && this.data.existing) {
      const c = this.data.existing;
      this.form.patchValue({
        title: c.title,
        description: c.description || '',
        attachmentUrl: c.attachmentUrl || '',
        category: c.category || '',
        level: c.level || '',
        price: c.price ?? 0,
        tags: (c.tags || []).join(', '),
        content: c.content || '',
      });
      this.existingCoverPhotoUrl = c.coverPhotoUrl || null;
      this.existingPdfUrl = c.pdfUrl || null;
    }

    this.loadCategories();
  }

  private loadCategories(): void {
    this.categoriesLoading = true;
    this.academyService.getCourseCategory().subscribe({
      next: (res) => {
        this.categories = res;
        this.categoriesLoading = false;
      },
      error: () => {
        this.categories = [];
        this.categoriesLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.revokeCoverPhotoPreview();
  }

  private revokeCoverPhotoPreview(): void {
    if (this.coverPhotoPreviewUrl) {
      URL.revokeObjectURL(this.coverPhotoPreviewUrl);
    }
  }

  // ---------- Cover photo ----------
  onSelectCoverPhoto(event: any): void {
    const file = this.validateFile(event, 'coverPhoto');
    if (!file) return;

    this.revokeCoverPhotoPreview();
    this.coverPhotoFile = file;
    this.coverPhotoPreviewUrl = URL.createObjectURL(file);
    this.existingCoverPhotoUrl = null;
  }

  onRemoveCoverPhoto(): void {
    this.revokeCoverPhotoPreview();
    this.coverPhotoFile = null;
    this.coverPhotoPreviewUrl = null;
    this.existingCoverPhotoUrl = null;
  }

  // ---------- PDF ----------
  onSelectPdf(event: any): void {
    const file = this.validateFile(event, 'pdf');
    if (!file) return;

    this.pdfFile = file;
    this.pdfFileName = file.name;
    this.existingPdfUrl = null;
  }

  onRemovePdf(): void {
    this.pdfFile = null;
    this.pdfFileName = null;
    this.existingPdfUrl = null;
  }

  // ---------- Shared validation ----------
  private validateFile(event: any, slot: UploadSlot): File | null {
    const addedFiles: File[] = event?.addedFiles ?? [];
    if (!addedFiles.length) return null;

    const file = addedFiles[addedFiles.length - 1];
    if (!(file instanceof File)) {
      this.errorMessage = `${this.slotLabel(slot)}: could not read the selected file.`;
      return null;
    }

    if (slot === 'coverPhoto') {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        this.errorMessage = 'Cover photo: only JPG, PNG, or WEBP images are allowed.';
        return null;
      }
      if (file.size > MAX_COVER_PHOTO_SIZE_BYTES) {
        this.errorMessage = 'Cover photo: file is too large (max 1MB).';
        return null;
      }
    }

    if (slot === 'pdf') {
      if (file.type !== ACCEPTED_PDF_TYPE) {
        this.errorMessage = 'Course PDF: only PDF files are allowed.';
        return null;
      }
      if (file.size > MAX_PDF_SIZE_BYTES) {
        this.errorMessage = 'Course PDF: file is too large (max 10MB).';
        return null;
      }
    }

    this.errorMessage = '';
    return file;
  }

  private slotLabel(slot: UploadSlot): string {
    return slot === 'coverPhoto' ? 'Cover photo' : 'Course PDF';
  }

  private uploadCoverPhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'trizbot');
    formData.append('folder', 'academy/covers');
    return this.academyService.uploadImage(formData);
  }

  private uploadPdf(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'trizbot');
    formData.append('folder', 'academy/pdfs');
    return this.academyService.uploadRawFile(formData);
  }

  close(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill in the required fields.';
      return;
    }

    this.loading = true;
    const raw = this.form.getRawValue();

    const coverPhoto$ = this.coverPhotoFile ? this.uploadCoverPhoto(this.coverPhotoFile) : of(null);
    const pdf$ = this.pdfFile ? this.uploadPdf(this.pdfFile) : of(null);

    forkJoin({ coverPhoto: coverPhoto$, pdf: pdf$ })
      .pipe(
        switchMap(({ coverPhoto, pdf }) => {
          const payload: CreateCourseReqBody | UpdateCourseReqBody = {
            title: raw.title.trim(),
            description: raw.description?.trim() || undefined,
            attachmentUrl: raw.attachmentUrl?.trim() || undefined,
            category: (raw.category as CourseCategory) || undefined,
            level: (raw.level as CourseLevel) || undefined,
            price: raw.price,
            coverPhotoUrl: coverPhoto ? coverPhoto.secure_url : this.existingCoverPhotoUrl || undefined,
            pdfUrl: pdf ? pdf.secure_url : this.existingPdfUrl || undefined,
            tags: raw.tags
              ? raw.tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              : undefined,
            content: raw.content?.trim() || undefined,
          };

          return this.isEditing && this.data.existing
            ? this.academyService.updateCourse(this.data.existing.id, payload)
            : this.academyService.createCourse(payload as CreateCourseReqBody);
        }),
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          const message = err?.error?.message || 'Could not save this course. Please try again.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }
}