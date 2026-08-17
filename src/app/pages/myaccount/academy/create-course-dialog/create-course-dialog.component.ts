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
  CourseFileKind,
  CourseLevel,
  CreateCourseReqBody,
  LEVEL_OPTIONS,
  MAX_COURSE_FILE_SIZE_BYTES,
  MAX_COURSE_FILE_SIZE_LABEL,
  UpdateCourseReqBody,
} from '../model/academy.model';

/**
 * NOTE: MAX_COURSE_FILE_SIZE_BYTES / MAX_COURSE_FILE_SIZE_LABEL from
 * academy.model.ts are now used ONLY for the cover photo (2MB).
 * Course material (pdf/docx/audio/video) uses the per-kind limits below
 * because a 2MB cap is unusable for audio/video lessons.
 *
 * These constants should really live in academy.model.ts alongside
 * MAX_COURSE_FILE_SIZE_BYTES so the backend/service layer can enforce the
 * same limits — see NOTES.md.
 */
const COVER_PHOTO_MAX_BYTES = MAX_COURSE_FILE_SIZE_BYTES; // 2MB, unchanged
const COVER_PHOTO_MAX_LABEL = MAX_COURSE_FILE_SIZE_LABEL;

const MATERIAL_LIMITS: Record<'document' | 'audio' | 'video', { bytes: number; label: string }> = {
  document: { bytes: 20 * 1024 * 1024, label: '20MB' }, // pdf / docx / doc
  audio: { bytes: 50 * 1024 * 1024, label: '50MB' },
  video: { bytes: 500 * 1024 * 1024, label: '500MB' },
};

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Maps every accepted MIME type to a CourseFileKind + which limit bucket applies.
// NOTE: 'kind' values here must match AcademyService.resourceTypeForKind's cases
// ('pdf' | 'docx' | 'audio' | 'video' | 'other') — using 'word' there would
// silently fall through to the 'raw' default, so we normalize to 'docx' here.
const MATERIAL_TYPE_MAP: Record<string, { kind: CourseFileKind; bucket: keyof typeof MATERIAL_LIMITS }> = {
  'application/pdf': { kind: 'pdf', bucket: 'document' },
  'application/msword': { kind: 'docx', bucket: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { kind: 'docx', bucket: 'document' },
  'audio/mpeg': { kind: 'audio', bucket: 'audio' },
  'audio/mp3': { kind: 'audio', bucket: 'audio' },
  'audio/wav': { kind: 'audio', bucket: 'audio' },
  'audio/x-wav': { kind: 'audio', bucket: 'audio' },
  'audio/mp4': { kind: 'audio', bucket: 'audio' },
  'audio/m4a': { kind: 'audio', bucket: 'audio' },
  'audio/ogg': { kind: 'audio', bucket: 'audio' },
  'video/mp4': { kind: 'video', bucket: 'video' },
  'video/webm': { kind: 'video', bucket: 'video' },
  'video/quicktime': { kind: 'video', bucket: 'video' },
  'video/x-matroska': { kind: 'video', bucket: 'video' },
};

const MATERIAL_ACCEPT_STRING = Object.keys(MATERIAL_TYPE_MAP).join(',');

export interface CreateCourseDialogData {
  existing?: Course;
}

type UploadSlot = 'coverPhoto' | 'material';

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
  readonly coverPhotoMaxLabel = COVER_PHOTO_MAX_LABEL;
  readonly materialAcceptString = MATERIAL_ACCEPT_STRING;

  // Categories are loaded from the backend.
  categories: CourseCategoryItem[] = [];
  categoriesLoading = false;

  loading = false;
  uploadingLabel = '';
  errorMessage = '';

  // ---- Cover photo ----
  coverPhotoFile: File | null = null;
  coverPhotoPreviewUrl: string | null = null;
  existingCoverPhotoUrl: string | null = null;

  // ---- Course material (pdf / docx / audio / video) — this is the "major" file ----
  materialFile: File | null = null;
  materialFileName: string | null = null;
  materialFileKind: CourseFileKind | null = null;
  existingMaterialUrl: string | null = null;
  existingMaterialKind: CourseFileKind | null = null;

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

  get hasMaterial(): boolean {
    return !!this.materialFile || !!this.existingMaterialUrl;
  }

  get materialDisplayName(): string | null {
    return this.materialFileName || (this.existingMaterialUrl ? this.existingMaterialUrl.split('/').pop() || 'Current file' : null);
  }

  get materialDisplayKind(): CourseFileKind | null {
    return this.materialFileKind || this.existingMaterialKind;
  }

  get materialIcon(): string {
    switch (this.materialDisplayKind) {
      case 'video':
        return 'movie';
      case 'audio':
        return 'audiotrack';
      case 'docx':
        return 'description';
      case 'pdf':
      default:
        return 'picture_as_pdf';
    }
  }

  get materialAcceptHint(): string {
    return 'PDF, DOC/DOCX, MP3/WAV/M4A, or MP4/MOV/WebM';
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
      // pdfUrl is the legacy/major-file field; courseFileUrl is current.
      // Prefer courseFileUrl but fall back to pdfUrl for older records.
      const existingUrl = c.courseFileUrl || c.pdfUrl || null;
      if (existingUrl) {
        this.existingMaterialUrl = existingUrl;
        this.existingMaterialKind = c.courseFileKind || (c.pdfUrl ? 'pdf' : 'other');
      }
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
    const file = this.extractFile(event);
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.errorMessage = 'Cover photo: only JPG, PNG, or WEBP images are allowed.';
      return;
    }
    if (file.size > COVER_PHOTO_MAX_BYTES) {
      this.errorMessage = `Cover photo: file is too large (max ${COVER_PHOTO_MAX_LABEL}).`;
      return;
    }

    this.errorMessage = '';
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

  // ---------- Course material (pdf / docx / audio / video) — THE major file ----------
  onSelectMaterial(event: any): void {
    const file = this.extractFile(event);
    if (!file) return;

    const match = MATERIAL_TYPE_MAP[file.type];
    if (!match) {
      this.errorMessage = 'Course material: only PDF, DOC/DOCX, audio (MP3/WAV/M4A), or video (MP4/MOV/WebM) files are allowed.';
      return;
    }

    const limit = MATERIAL_LIMITS[match.bucket];
    if (file.size > limit.bytes) {
      this.errorMessage = `Course material: file is too large (max ${limit.label} for ${match.kind} files).`;
      return;
    }

    this.errorMessage = '';
    this.materialFile = file;
    this.materialFileName = file.name;
    this.materialFileKind = match.kind;
    this.existingMaterialUrl = null;
    this.existingMaterialKind = null;
  }

  onRemoveMaterial(): void {
    this.materialFile = null;
    this.materialFileName = null;
    this.materialFileKind = null;
    this.existingMaterialUrl = null;
    this.existingMaterialKind = null;
  }

  private extractFile(event: any): File | null {
    const addedFiles: File[] = event?.addedFiles ?? [];
    if (!addedFiles.length) return null;

    const file = addedFiles[addedFiles.length - 1];
    if (!(file instanceof File)) {
      this.errorMessage = 'Could not read the selected file.';
      return null;
    }
    return file;
  }

  private uploadCoverPhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'trizbot');
    formData.append('folder', 'academy/covers');
    return this.academyService.uploadImage(formData, file);
  }

  /**
   * FIX: previously called uploadRawFile(), which is a deprecated wrapper
   * that always uploads with kind='pdf' regardless of what was actually
   * selected — meaning audio/video/docx files were routed to Cloudinary's
   * `raw/upload` endpoint instead of `video/upload`, producing broken or
   * unplayable uploads. uploadCourseFile() routes by the real kind.
   */
  private uploadMaterial(file: File, kind: CourseFileKind) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'trizbot');
    formData.append('folder', `academy/materials/${kind}`);
    return this.academyService.uploadCourseFile(formData, file, kind);
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

    // Defensive re-check right before submit.
    if (this.coverPhotoFile && this.coverPhotoFile.size > COVER_PHOTO_MAX_BYTES) {
      this.errorMessage = `Cover photo: file is too large (max ${COVER_PHOTO_MAX_LABEL}).`;
      return;
    }
    if (this.materialFile && this.materialFileKind) {
      const bucket = MATERIAL_TYPE_MAP[this.materialFile.type]?.bucket;
      const limit = bucket ? MATERIAL_LIMITS[bucket] : null;
      if (limit && this.materialFile.size > limit.bytes) {
        this.errorMessage = `Course material: file is too large (max ${limit.label}).`;
        return;
      }
    }

    this.loading = true;
    this.uploadingLabel = this.materialFileKind === 'video' ? 'Uploading video — this can take a while...' : 'Saving...';
    const raw = this.form.getRawValue();

    const coverPhoto$ = this.coverPhotoFile ? this.uploadCoverPhoto(this.coverPhotoFile) : of(null);
    const material$ =
      this.materialFile && this.materialFileKind ? this.uploadMaterial(this.materialFile, this.materialFileKind) : of(null);

    forkJoin({ coverPhoto: coverPhoto$, material: material$ })
      .pipe(
        switchMap(({ coverPhoto, material }) => {
          // The uploaded/kept course material is the "major" file for this
          // course. It's written to courseFileUrl (current field) AND
          // mirrored onto pdfUrl (legacy/fallback field), since downstream
          // consumers (downloadPurchase, downloadCourseFile, share links)
          // read pdfUrl as a fallback when courseFileUrl is absent.
          const materialUrl = material ? material.secure_url : this.existingMaterialUrl || undefined;

          const payload: CreateCourseReqBody | UpdateCourseReqBody = {
            title: raw.title.trim(),
            description: raw.description?.trim() || undefined,
            attachmentUrl: raw.attachmentUrl?.trim() || undefined,
            category: (raw.category as CourseCategory) || undefined,
            level: (raw.level as CourseLevel) || undefined,
            price: raw.price,
            coverPhotoUrl: coverPhoto ? coverPhoto.secure_url : this.existingCoverPhotoUrl || undefined,
            courseFileUrl: materialUrl,
            pdfUrl: materialUrl,
            courseFileKind: material ? this.materialFileKind || undefined : this.existingMaterialKind || undefined,
            courseFileName: this.materialFile ? this.materialFile.name : undefined,
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