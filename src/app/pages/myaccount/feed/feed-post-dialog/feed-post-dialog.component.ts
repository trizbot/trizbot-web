import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';

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


@Component({
  selector: 'app-feed-post-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './feed-post-dialog.component.html',
  styleUrls: ['./feed-post-dialog.component.scss'],
})
export class FeedPostDialogComponent implements OnInit {
  readonly categoryOptions = FEED_CATEGORY_OPTIONS;
  readonly categoryLabels = FEED_CATEGORY_LABELS;

  saving = false;
  error: string | null = null;

  form = new FormGroup({
    title: new FormControl<string>('', [Validators.required, Validators.maxLength(300)]),
    summary: new FormControl<string>('', [Validators.maxLength(500)]),
    content: new FormControl<string>('', [Validators.required]),
    source: new FormControl<string>('', [Validators.maxLength(200)]),
    sourceUrl: new FormControl<string>(''),
    imageUrl: new FormControl<string>(''),
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

  ngOnInit(): void {
    if (this.isEdit && this.data.item) {
      const item = this.data.item;
      this.form.patchValue({
        title: item.title,
        summary: item.summary ?? '',
        content: item.content,
        source: item.source ?? '',
        sourceUrl: item.sourceUrl ?? '',
        imageUrl: item.imageUrl ?? '',
        category: item.category ?? '',
        coinSymbol: item.coinSymbol ?? '',
        tagsRaw: (item.tags ?? []).join(', '),
        isPublished: item.isPublished,
      });
    }
  }

  close(): void {
    this.dialogRef.close(false);
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

    const payload = {
      title: raw.title!.trim(),
      summary: raw.summary?.trim() || undefined,
      content: raw.content!.trim(),
      source: raw.source?.trim() || undefined,
      sourceUrl: raw.sourceUrl?.trim() || undefined,
      imageUrl: raw.imageUrl?.trim() || undefined,
      category: raw.category || undefined,
      coinSymbol: raw.coinSymbol?.trim() || undefined,
      tags: tags.length ? tags : undefined,
      isPublished: raw.isPublished ?? false,
    };

    this.saving = true;
    this.error = null;

    const request$ = this.isEdit
      ? this.feedService.updateFeed(this.data.item!.id, payload)
      : this.feedService.createFeed(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.error = 'Could not save post. Please check the fields and try again.';
      },
    });
  }
}