import { CommonModule } from '@angular/common';
import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { Subject, of } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { FeedService } from '../feed.service';
import { CreateFeedPayload, FeedCategoryItem, FeedItem } from '../model/feed.model';
import { TraderService } from '../../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../../app/services/auth.type';

export interface FeedPostDialogData {
  mode: 'create' | 'edit';
  item?: FeedItem;
  /**
   * Live category list, forwarded by the parent FeedComponent (loaded from
   * FeedService.getFeedCategory()). This dialog never falls back to a
   * static enum — if the parent passes nothing, the picker just shows
   * "None" plus whatever the post already had saved.
   */
  categories?: FeedCategoryItem[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

@Component({
  selector: 'app-feed-post-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, NgxDropzoneModule],
  templateUrl: './feed-post-dialog.component.html',
  styleUrls: ['./feed-post-dialog.component.scss'],
})
export class FeedPostDialogComponent implements OnInit, OnDestroy {

  categories: FeedCategoryItem[] = [];

  saving = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  reference: string | null = null;

  // ── Image upload state ─────────────────────────────────────
  imageFiles: File[] = [];
  imagePreviewUrl: string | null = null;
  existingImageUrl: string | null = null;

  // ── Preview zoom state ─────────────────────────────────────
  zoom = MIN_ZOOM;
  panX = 0;
  panY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;

  form = new FormGroup({
    title: new FormControl<string>('', [Validators.required, Validators.maxLength(300)]),
    summary: new FormControl<string>('', [Validators.maxLength(500)]),
    content: new FormControl<string>('', [Validators.required]),
    source: new FormControl<string>('', [Validators.maxLength(200)]),
    sourceUrl: new FormControl<string>(''),
    // Plain string now (not a FeedCategoryEnum) — category is whatever
    // name the API-backed category list uses.
    category: new FormControl<string>(''),
    coinSymbol: new FormControl<string>(''),
    tagsRaw: new FormControl<string>(''), // comma-separated input, split on submit
    isPublished: new FormControl<boolean>(true),
  });

  constructor(
    private dialogRef: MatDialogRef<FeedPostDialogComponent>,
    private feedService: FeedService,
    private sharedService: SharedService,
    private traderService: TraderService,
    @Inject(MAT_DIALOG_DATA) public data: FeedPostDialogData,
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

  get zoomPercent(): string {
    return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 }).format(
      this.zoom,
    );
  }

  get canZoomIn(): boolean {
    return this.zoom < MAX_ZOOM;
  }

  get canZoomOut(): boolean {
    return this.zoom > MIN_ZOOM;
  }

  ngOnInit(): void {
    // Independent server-side re-check: bail out if this user isn't
    // actually a super-admin, regardless of how the dialog was opened.
    this.traderService
      .getTrader()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: GetTraderResBody) => {
          if (!res.data?.isSuperAdmin) {
            this.sharedService.showToast({ title: 'You do not have permission to do this.' });
            this.dialogRef.close(false);
          }
        },
        error: () => {
          this.sharedService.showToast({ title: 'Could not verify permissions. Please try again.' });
          this.dialogRef.close(false);
        },
      });

    this.categories = this.data.categories ? [...this.data.categories] : [];

    if (this.isEdit && this.data.item) {
      const item = this.data.item;

      // If the post's saved category isn't in the live list (renamed or
      // deleted since), add it back in so the select still shows the
      // real current value instead of silently reverting to "None".
      if (item.category && !this.categories.some((c) => c.category === item.category)) {
        this.categories = [
          { id: `__current-${item.id}`, category: item.category, createdAt: item.createdAt },
          ...this.categories,
        ];
      }

      this.form.patchValue({
        title: item.title,
        summary: item.summary ?? '',
        content: item.content,
        source: item.source ?? 'NA',
        sourceUrl: item.sourceUrl ?? 'NA',
        category: item.category ?? '',
        coinSymbol: item.coinSymbol ?? '',
        tagsRaw: (item.tags ?? []).join(', '),
        isPublished: item.isPublished,
      });
      this.existingImageUrl = item.imageUrl ?? null;
      this.reference = item.reference ?? null;
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
    this.destroy$.next();
    this.destroy$.complete();
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
    this.resetZoom();
  }

  onRemoveImage(): void {
    this.revokePreview();
    this.imageFiles = [];
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
    this.resetZoom();
  }

  onPreviewImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    console.error('[FeedPost] Preview image failed to load. src was:', target?.src);
  }

  // ── Zoom controls ───────────────────────────────────────────
  zoomIn(event?: Event): void {
    event?.stopPropagation();
    this.setZoom(this.zoom + ZOOM_STEP);
  }

  zoomOut(event?: Event): void {
    event?.stopPropagation();
    this.setZoom(this.zoom - ZOOM_STEP);
  }

  resetZoom(event?: Event): void {
    event?.stopPropagation();
    this.zoom = MIN_ZOOM;
    this.panX = 0;
    this.panY = 0;
  }

  private setZoom(next: number): void {
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (this.zoom === MIN_ZOOM) {
      this.panX = 0;
      this.panY = 0;
    }
  }

  onPreviewWheel(event: WheelEvent): void {
    if (!this.displayImageUrl) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    this.setZoom(this.zoom + delta);
  }

  onPreviewPointerDown(event: PointerEvent): void {
    if (this.zoom <= MIN_ZOOM) return;
    event.stopPropagation();
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.panStartX = this.panX;
    this.panStartY = this.panY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPreviewPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;
    this.panX = this.panStartX + (event.clientX - this.dragStartX);
    this.panY = this.panStartY + (event.clientY - this.dragStartY);
  }

  onPreviewPointerUp(): void {
    this.isDragging = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.displayImageUrl) return;
    if (event.key === '+' || event.key === '=') this.zoomIn();
    if (event.key === '-') this.zoomOut();
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

  /**
   * Builds the create/update payload.
   *
   * HISTORY OF THIS METHOD, so the reasoning doesn't get lost again:
   *  1. Originally cleared fields were sent as `undefined`. `JSON.stringify`
   *     (what HttpClient uses to serialize the body) drops `undefined` keys
   *     entirely, so clearing a field on an edit silently did nothing — the
   *     PATCH body just never mentioned that key.
   *  2. The fix for that switched cleared fields to explicit `null`. That
   *     broke CREATE (and most edits) instead: typical NestJS
   *     `class-validator` DTOs use `@IsOptional()`, which only treats
   *     `undefined` as "absent" — an explicit `null` still runs through
   *     `@IsString()`/`@IsEnum()` and fails validation, so the whole
   *     request got rejected with a 400 ("unable to create/save post").
   *  3. The actual fix: send an explicit EMPTY STRING for cleared text
   *     fields. `''` survives `JSON.stringify` (so clearing still reaches
   *     the backend and persists), and it satisfies `@IsString()` /
   *     `@IsOptional()` validators that reject `null` outright.
   *  4. `category` is the one exception — it's validated against a fixed
   *     set of names server-side, so an empty string could still fail
   *     validation depending on the DTO. It's omitted from the payload
   *     entirely when cleared (same `undefined`-drop behavior as before)
   *     to avoid ever 400ing the request; clearing category on an
   *     existing post is a narrower, lower-stakes gap than breaking saves.
   *  5. `tags` always sends a real array — arrays are never dropped by
   *     JSON.stringify, so `[]` correctly clears tags on update.
   */
  private buildPayload(
    imageUrl: string,
    raw: ReturnType<typeof this.form.getRawValue>,
  ): CreateFeedPayload {
    const tags = (raw.tagsRaw || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: CreateFeedPayload = {
      title: raw.title!.trim(),
      summary: raw.summary?.trim() || '',
      content: raw.content!.trim(),
      source: raw.source?.trim() || '',
      sourceUrl: raw.sourceUrl?.trim() || '',
      imageUrl,
      coinSymbol: raw.coinSymbol?.trim() || '',
      tags, // always an array — [] explicitly clears tags on update
      isPublished: raw.isPublished ?? false,
     
    };


    if (raw.category) {
      payload.category = raw.category;
    }

    return payload;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.saving = true;
    this.error = null;

    const image$ = this.imageFiles.length
      ? this.uploadImage(this.imageFiles[0])
      : of(this.existingImageUrl ? { secure_url: this.existingImageUrl } : null);

    image$
      .pipe(
        switchMap((imageRes) => {
          // A freshly uploaded file or the untouched existing URL resolves
          // to that URL; a removed or never-set image resolves to '' —
          // a valid string, so it clears the field on update without
          // tripping type validation the way `null` would.
          const imageUrl = imageRes?.secure_url || '';
          const payload = this.buildPayload(imageUrl, raw);
          return this.isEdit
            ? this.feedService.updateFeed(this.data.item!.id, payload)
            : this.feedService.createFeed(payload);
        }),
        finalize(() => (this.saving = false)),
      )
      .subscribe({
        next: (savedItem) => {
          this.reference = savedItem.reference ?? this.reference;
          this.dialogRef.close(true);
        },
        error: (err) => {
          if (err?.slot === 'image') {
            this.error = 'Image upload failed. Please try again.';
            return;
          }
          const backendMessage = err?.error?.message;
          const detail = Array.isArray(backendMessage) ? backendMessage.join(' ') : backendMessage;
          this.error = detail || 'Could not save post. Please check the fields and try again.';
        },
      });
  }
}