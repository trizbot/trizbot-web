import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { FeedService } from './feed.service';
import { FeedPostDialogComponent } from './feed-post-dialog/feed-post-dialog.component';
import {
  FeedItem,
  FEED_CATEGORY_COLORS,
  FEED_CATEGORY_LABELS,
  FEED_CATEGORY_OPTIONS,
  FeedCategoryEnum,
} from './model/feed.model';
import { TraderService } from '../../../../app/appstate/trader.service';

type FeedTab = 'feed' | 'trending' | 'manage';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss'],
})
export class FeedComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private traderService = inject(TraderService);
  private destroy$ = new Subject<void>();

  readonly categoryOptions = FEED_CATEGORY_OPTIONS;
  readonly categoryLabels = FEED_CATEGORY_LABELS;
  readonly categoryColors = FEED_CATEGORY_COLORS;

  activeTab: FeedTab = 'feed';

  filterForm = new FormGroup({
    search: new FormControl<string>(''),
    category: new FormControl<FeedCategoryEnum | ''>(''),
    coinSymbol: new FormControl<string>(''),
  });

  // All feed
  items: FeedItem[] = [];
  itemsLoading = false;
  page = 1;
  limit = 12;
  total = 0;

  // Trending
  trending: FeedItem[] = [];
  trendingLoading = false;
  syncingTrending = false;

  // Manage (admin)
  manageItems: FeedItem[] = [];
  manageLoading = false;
  deletingId: string | null = null;

  constructor(private feedService: FeedService, private dialog: MatDialog) {}

  // Sourced from TraderService.entityName rather than SharedService.
  // Adjust the comparison string ('Admin') if your entityName values differ from EntityRole.
  get isAdmin(): boolean {
    const entityName=  localStorage.getItem('entity');
    return entityName === 'Admin';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  ngOnInit(): void {
    this.loadItems();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadItems();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: FeedTab): void {
    this.activeTab = tab;

    if (tab === 'trending' && this.trending.length === 0) {
      this.loadTrending();
    }

    if (tab === 'manage' && this.isAdmin && this.manageItems.length === 0) {
      this.loadManageItems();
    }
  }

  // ─── All Feed ──────────────────────────────────────────────

  loadItems(): void {
    this.itemsLoading = true;
    const { search, category, coinSymbol } = this.filterForm.getRawValue();

    this.feedService
      .getFeed({
        search: search || undefined,
        category: category || undefined,
        coinSymbol: coinSymbol || undefined,
        page: this.page,
        limit: this.limit,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
          this.itemsLoading = false;
        },
        error: () => {
          this.itemsLoading = false;
        },
      });
  }

  clearFilters(): void {
    this.filterForm.reset({ search: '', category: '', coinSymbol: '' });
  }

  filterByCategory(category: FeedCategoryEnum): void {
    this.filterForm.patchValue({ category });
  }

  openSource(item: FeedItem, event: Event): void {
    event.stopPropagation();
    if (item.sourceUrl) {
      window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadItems();
  }

  pageRange(): number[] {
    const range: number[] = [];
    const total = this.totalPages;
    const current = this.page;
    const spread = 2;

    const start = Math.max(1, current - spread);
    const end = Math.min(total, current + spread);

    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  timeAgo(date: string | Date): string {
    const then = new Date(date).getTime();
    const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

    const units: [number, string][] = [
      [60, 'second'],
      [60, 'minute'],
      [24, 'hour'],
      [7, 'day'],
      [4.345, 'week'],
      [12, 'month'],
      [Number.POSITIVE_INFINITY, 'year'],
    ];

    let value = seconds;
    let unitLabel = 'second';

    for (const [amount, name] of units) {
      if (value < amount) {
        unitLabel = name;
        break;
      }
      value = Math.floor(value / amount);
      unitLabel = name;
    }

    if (unitLabel === 'second' && value < 10) return 'just now';
    return `${value} ${unitLabel}${value === 1 ? '' : 's'} ago`;
  }

  // ─── Trending ──────────────────────────────────────────────

  loadTrending(): void {
    this.trendingLoading = true;
    this.feedService
      .getTrending(20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.trending = res;
          this.trendingLoading = false;
        },
        error: () => {
          this.trendingLoading = false;
        },
      });
  }

  syncTrending(): void {
    this.syncingTrending = true;
    this.feedService
      .syncTrending()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.syncingTrending = false;
          this.sharedService.showToast({ title: 'Trending sync triggered.' });
          this.loadTrending();
        },
        error: () => {
          this.syncingTrending = false;
          this.sharedService.showToast({ title: 'Could not sync trending items.' });
        },
      });
  }

  // ─── Manage (admin) ────────────────────────────────────────

  loadManageItems(): void {
    this.manageLoading = true;
    this.feedService
      .getFeed({ page: 1, limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.manageItems = res.items;
          this.manageLoading = false;
        },
        error: () => {
          this.manageLoading = false;
        },
      });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(FeedPostDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { mode: 'create' },
    });

    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.sharedService.showToast({ title: 'Post created successfully.' });
        this.loadItems();
        if (this.isAdmin) this.loadManageItems();
      }
    });
  }

  openEditDialog(item: FeedItem): void {
    const ref = this.dialog.open(FeedPostDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { mode: 'edit', item },
    });

    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.sharedService.showToast({ title: 'Post updated successfully.' });
        this.loadItems();
        this.loadManageItems();
      }
    });
  }

  deletePost(item: FeedItem): void {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;

    this.deletingId = item.id;
    this.feedService
      .deleteFeed(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.manageItems = this.manageItems.filter((i) => i.id !== item.id);
          this.sharedService.showToast({ title: 'Post deleted.' });
          this.loadItems();
        },
        error: () => {
          this.deletingId = null;
          this.sharedService.showToast({ title: 'Could not delete post.' });
        },
      });
  }
}