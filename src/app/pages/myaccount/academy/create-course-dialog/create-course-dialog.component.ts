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


const COVER_PHOTO_MAX_BYTES = MAX_COURSE_FILE_SIZE_BYTES; // 2MB
const COVER_PHOTO_MAX_LABEL = MAX_COURSE_FILE_SIZE_LABEL; // "2MB"

const REQUIRED_FILE_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const REQUIRED_FILE_MAX_LABEL = '2MB';

const MATERIAL_LIMITS: Record<'document' | 'audio' | 'video', { bytes: number; label: string }> = {
  document: { bytes: REQUIRED_FILE_MAX_BYTES, label: REQUIRED_FILE_MAX_LABEL }, // pdf / docx / doc
  audio: { bytes: REQUIRED_FILE_MAX_BYTES, label: REQUIRED_FILE_MAX_LABEL },
  video: { bytes: REQUIRED_FILE_MAX_BYTES, label: REQUIRED_FILE_MAX_LABEL },
};

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];


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
  readonly materialMaxLabel = REQUIRED_FILE_MAX_LABEL;
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
  // NOTE: material is now OPTIONAL. A course is publishable as long as it has
  // *either* an uploaded material file *or* a non-empty attachmentUrl (for
  // files too large to upload — see MATERIAL_LIMITS above / needsMaterialOrLink()).
  materialFile: File | null = null;
  materialFileName: string | null = null;
  materialFileKind: CourseFileKind | null = null;
  existingMaterialUrl: string | null = null;
  existingMaterialKind: CourseFileKind | null = null;

  form = new FormGroup({
    title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    // Optional fields — no `required` validator on purpose.
    description: new FormControl<string>(''),
    attachmentUrl: new FormControl<string>(''),
    tags: new FormControl<string>(''),
    // Content / syllabus is optional. Only its max length is enforced.
    content: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(this.maxContentLength)],
    }),
    // category/level/price remain required for a course to be publishable.
    category: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    level: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
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

  get hasAttachmentUrl(): boolean {
    return !!this.form.get('attachmentUrl')?.value?.trim();
  }

  /**
   * Course material is optional, but the course still needs *some* way to
   * deliver the lesson: either an uploaded file, or an attachment URL for
   * files too large to upload. True when neither is present.
   */
  get needsMaterialOrLink(): boolean {
    return !this.hasMaterial && !this.hasAttachmentUrl;
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
      // Material is optional precisely so people with an oversized file
      // aren't stuck — point them at the Attachment URL field instead of
      // just rejecting the upload.
      this.errorMessage = `Course material: file is too large (max ${limit.label}). Use the Attachment URL field instead for larger files.`;
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
   * unplayable uploads. uploadCourseFile() routes by the real kind (and, as
   * of this fix, PDFs specifically go through the `image` resource type —
   * see resourceTypeForKind() in academy.service.ts — to avoid Cloudinary's
   * "raw" delivery restrictions that were causing uploaded PDFs to fail to
   * open).
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


  private collectValidationErrors(): string[] {
    const errors: string[] = [];
    const raw = this.form.getRawValue();

    if (!raw.title?.trim()) {
      errors.push('Course Title is very important.');
    }
    if (!raw.category) {
      errors.push('Category is required.');
    }
    if (!raw.level) {
      errors.push('Level is required.');
    }
    if (raw.price === null || raw.price === undefined || (raw.price as any) === '') {
      errors.push('Price is required (enter 0 for a free course).');
    } else if (raw.price < 0) {
      errors.push('Price cannot be negative.');
    }

    // Content / syllabus is optional — only validate it if the user typed something.
    const trimmedContent = raw.content?.trim() || '';
    if (trimmedContent.length > 0 && trimmedContent.length <= 12) {
      errors.push('Course content / syllabus is too short — add more detail or leave it blank.');
    } else if (raw.content && raw.content.length > this.maxContentLength) {
      errors.push(`Course content / syllabus must be ${this.maxContentLength} characters or fewer.`);
    }

    if (!this.hasCoverPhoto) {
      errors.push('A cover photo is required.');
    }

    // Material is optional, but the course needs a way to deliver the lesson:
    // either an uploaded file, or an attachment URL (for files too large to upload).
    if (this.needsMaterialOrLink) {
      errors.push('Add a course material file, or an Attachment URL if your file is too large to upload.');
    }

    if (this.coverPhotoFile!=null && this.coverPhotoFile.size > COVER_PHOTO_MAX_BYTES) {
      errors.push(`Cover photo file is too large (max ${COVER_PHOTO_MAX_LABEL}).`);
    }
    if (this.materialFile!=null) {
      const bucket = MATERIAL_TYPE_MAP[this.materialFile.type]?.bucket;
      const limit = bucket ? MATERIAL_LIMITS[bucket] : null;
      if (limit && this.materialFile.size > limit.bytes) {
        errors.push(`Course material file is too large (max ${limit.label}). Use the Attachment URL field instead.`);
      }
    }

    return errors;
  }

  submit(): void {
    this.errorMessage = '';

    this.form.markAllAsTouched();

    const errors = this.collectValidationErrors();
    if (errors.length > 0) {
      this.errorMessage = errors.join(' ');
      return;
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

          // materialUrl stays undefined when there's no uploaded file (new or
          // existing) — that's what lets the download logic in academy.component.ts
          // fall through to attachmentUrl for courses that were created with a
          // link instead of an upload.
          const materialUrl = material ? material.secure_url : this.existingMaterialUrl || undefined;

          const payload: CreateCourseReqBody | UpdateCourseReqBody = {
            title: raw.title.trim(),
            description: raw.description?.trim() || undefined,
            attachmentUrl: raw.attachmentUrl?.trim() || undefined,
            category: (raw.category as CourseCategory) || undefined,
            level: (raw.level as CourseLevel) || undefined,
            price: raw.price as number,
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