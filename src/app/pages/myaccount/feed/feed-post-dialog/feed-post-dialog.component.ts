import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { FeedService } from '../feed.service';
import {
  FEED_CATEGORY_LABELS,
  FEED_CATEGORY_OPTIONS,
  FeedCategoryEnum,
  FeedItem,
} from '../model/feed.model';

export interface FeedPostDialogData {
  mode: 'create' | 'edit';
  item?: FeedItem;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-feed-post-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, NgxDropzoneModule],
  templateUrl: './feed-post-dialog.component.html',
  styleUrls: ['./feed-post-dialog.component.scss'],
})
export class FeedPostDialogComponent implements OnInit, OnDestroy {
  readonly categoryOptions = FEED_CATEGORY_OPTIONS;
  readonly categoryLabels = FEED_CATEGORY_LABELS;

  saving = false;
  error: string | null = null;

  // ── Image upload state ─────────────────────────────────────
  imageFiles: File[] = [];
  imagePreviewUrl: string | null = null;
  /** Existing image URL (edit mode) kept until the user picks a new file or removes it. */
  existingImageUrl: string | null = null;

  form = new FormGroup({
    title: new FormControl<string>('', [Validators.required, Validators.maxLength(300)]),
    summary: new FormControl<string>('', [Validators.maxLength(500)]),
    content: new FormControl<string>('', [Validators.required]),
    source: new FormControl<string>('', [Validators.maxLength(200)]),
    sourceUrl: new FormControl<string>(''),
    category: new FormControl<FeedCategoryEnum | ''>(''),
    coinSymbol: new FormControl<string>(''),
    tagsRaw: new FormControl<string>(''), // comma-separated input, split on submit
    isPublished: new FormControl<boolean>(false),
  });

  constructor(
    private dialogRef: MatDialogRef<FeedPostDialogComponent>,
    private feedService: FeedService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: FeedPostDialogData
  ) {}

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  get dialogTitle(): string {
    return this.isEdit ? 'Edit Post' : 'New Post';
  }

  /** What's actually shown in the preview slot — a freshly picked file, or the existing image. */
  get displayImageUrl(): string | null {
    return this.imagePreviewUrl || this.existingImageUrl;
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.item) {
      const item = this.data.item;
      this.form.patchValue({
        title: item.title,
        summary: item.summary ?? '',
        content: item.content,
        source: item.source ?? '',
        sourceUrl: item.sourceUrl ?? '',
        category: (item.category as FeedCategoryEnum) ?? '',
        coinSymbol: item.coinSymbol ?? '',
        tagsRaw: (item.tags ?? []).join(', '),
        isPublished: item.isPublished,
      });
      this.existingImageUrl = item.imageUrl ?? null;
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  private revokePreview(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
  }

  onSelectImage(event: any): void {
    const addedFiles: File[] = event?.addedFiles ?? [];
    if (!addedFiles.length) return;

    const file = addedFiles[addedFiles.length - 1];

    if (!(file instanceof File)) {
      this.error = 'Could not read the selected image file.';
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.error = 'Image: only JPG, PNG, or WEBP files are allowed.';
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.error = 'Image: file is too large (max 5MB).';
      return;
    }

    this.error = null;
    this.revokePreview();
    this.imageFiles = [file];
    this.imagePreviewUrl = URL.createObjectURL(file);
    // A newly picked file always takes priority over the old URL.
    this.existingImageUrl = null;
  }

  onRemoveImage(): void {
    this.revokePreview();
    this.imageFiles = [];
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
  }

  onPreviewImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    console.error('[FeedPost] Preview image failed to load. src was:', target?.src);
  }

  close(): void {
    this.dialogRef.close(false);
  }

  private uploadImage(file: File) {
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', 'trizbot');
    uploadData.append('folder', 'feed/images');

    return this.feedService.uploadImage(uploadData).pipe(
      catchError((err) => {
        throw { slot: 'image', err };
      }),
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const tags = (raw.tagsRaw || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const buildPayload = (imageUrl: string | undefined) => ({
      title: raw.title!.trim(),
      summary: raw.summary?.trim() || undefined,
      content: raw.content!.trim(),
      source: raw.source?.trim() || undefined,
      sourceUrl: raw.sourceUrl?.trim() || undefined,
      imageUrl,
      category: raw.category || undefined,
      coinSymbol: raw.coinSymbol?.trim() || undefined,
      tags: tags.length ? tags : undefined,
      isPublished: raw.isPublished ?? false,
    });

    this.saving = true;
    this.error = null;

    // Decide the image source: a newly picked file needs uploading first;
    // otherwise fall back to whatever existing URL is left (or none, if removed).
    const image$ = this.imageFiles.length
      ? this.uploadImage(this.imageFiles[0])
      : of(this.existingImageUrl ? { secure_url: this.existingImageUrl } : null);

    image$
      .pipe(
        switchMap((imageRes) => {
          const payload = buildPayload(imageRes?.secure_url || undefined);
          return this.isEdit
            ? this.feedService.updateFeed(this.data.item!.id, payload)
            : this.feedService.createFeed(payload);
        }),
        finalize(() => (this.saving = false)),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          if (err?.slot === 'image') {
            this.error = 'Image upload failed. Please try again.';
          } else {
            this.error = 'Could not save post. Please check the fields and try again.';
          }
        },
      });
  }
}