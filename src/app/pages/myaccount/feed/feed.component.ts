import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
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
import { GetTraderResBody } from '../../../../app/services/auth.type';

type FeedTab = 'feed' | 'trending' | 'manage';

const MIN_LIGHTBOX_ZOOM = 1;
const MAX_LIGHTBOX_ZOOM = 4;
const LIGHTBOX_ZOOM_STEP = 0.25;

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

  isSuperAdmin = false;
  activeTab: FeedTab = 'feed';

  /** Currently selected category from the button navigation ('' = All) */
  activeCategory: FeedCategoryEnum | '' = '';

  filterForm = new FormGroup({
    search: new FormControl<string>(''),
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

  // ── Detail lightbox (zoomable image viewer) ────────────────
  lightboxItem: FeedItem | null = null;
  lightboxZoom = MIN_LIGHTBOX_ZOOM;
  lightboxPanX = 0;
  lightboxPanY = 0;
  private lightboxDragging = false;
  private lightboxDragStartX = 0;
  private lightboxDragStartY = 0;
  private lightboxPanStartX = 0;
  private lightboxPanStartY = 0;

  constructor(private feedService: FeedService, private dialog: MatDialog) {}

  get isAdmin(): boolean {
    const entityName = localStorage.getItem('entity');
    return entityName === 'Admin';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get lightboxZoomPercent(): string {
    return `${Math.round(this.lightboxZoom * 100)}%`;
  }

  get canLightboxZoomIn(): boolean {
    return this.lightboxZoom < MAX_LIGHTBOX_ZOOM;
  }

  get canLightboxZoomOut(): boolean {
    return this.lightboxZoom > MIN_LIGHTBOX_ZOOM;
  }

  ngOnInit(): void {
    this.loadItems();
    this.getTrader();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadItems();
      });
  }

  getTrader(): void {
    this.traderService
      .getTrader()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: GetTraderResBody) => {
          this.isSuperAdmin = !!res.data?.isSuperAdmin;
        },
        error: () => {
          // Fail closed: isSuperAdmin stays false if this lookup fails.
        },
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
    const { search, coinSymbol } = this.filterForm.getRawValue();

    this.feedService
      .getFeed({
        search: search || undefined,
        coinSymbol: coinSymbol || undefined,
        // activeCategory is '' for "All" — the service strips empty values
        // so this never sends a stray `category=` param.
        category: this.activeCategory || undefined,
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
          this.items = [];
          this.total = 0;
          this.itemsLoading = false;
        },
      });
  }

  clearFilters(): void {
    this.activeCategory = '';
    this.page = 1;
    // reset() re-triggers valueChanges, which already calls loadItems().
    this.filterForm.reset({ search: '', coinSymbol: '' });
  }

  /** Button-based category navigation. Pass '' to select "All". */
  filterByCategory(category: FeedCategoryEnum | string): void {
    const next = (category as FeedCategoryEnum) || '';
    if (next === this.activeCategory) return;
    this.activeCategory = next;
    this.page = 1;
    this.loadItems();
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

  timeAgo(item: FeedItem): string {
    const date = item.publishedAt || item.createdAt;
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

  trackByItemId(_index: number, item: FeedItem): string {
    return item.id;
  }

  // ─── Detail lightbox ───────────────────────────────────────

  openLightbox(item: FeedItem, event?: Event): void {
    event?.stopPropagation();
    if (!item.imageUrl) return;
    this.lightboxItem = item;
    this.resetLightboxZoom();
  }

  closeLightbox(): void {
    this.lightboxItem = null;
    this.resetLightboxZoom();
  }

  lightboxZoomIn(event?: Event): void {
    event?.stopPropagation();
    this.setLightboxZoom(this.lightboxZoom + LIGHTBOX_ZOOM_STEP);
  }

  lightboxZoomOut(event?: Event): void {
    event?.stopPropagation();
    this.setLightboxZoom(this.lightboxZoom - LIGHTBOX_ZOOM_STEP);
  }

  resetLightboxZoom(event?: Event): void {
    event?.stopPropagation();
    this.lightboxZoom = MIN_LIGHTBOX_ZOOM;
    this.lightboxPanX = 0;
    this.lightboxPanY = 0;
  }

  private setLightboxZoom(next: number): void {
    this.lightboxZoom = Math.min(MAX_LIGHTBOX_ZOOM, Math.max(MIN_LIGHTBOX_ZOOM, next));
    if (this.lightboxZoom === MIN_LIGHTBOX_ZOOM) {
      this.lightboxPanX = 0;
      this.lightboxPanY = 0;
    }
  }

  onLightboxWheel(event: WheelEvent): void {
    if (!this.lightboxItem) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -LIGHTBOX_ZOOM_STEP : LIGHTBOX_ZOOM_STEP;
    this.setLightboxZoom(this.lightboxZoom + delta);
  }

  onLightboxPointerDown(event: PointerEvent): void {
    if (this.lightboxZoom <= MIN_LIGHTBOX_ZOOM) return;
    event.stopPropagation();
    this.lightboxDragging = true;
    this.lightboxDragStartX = event.clientX;
    this.lightboxDragStartY = event.clientY;
    this.lightboxPanStartX = this.lightboxPanX;
    this.lightboxPanStartY = this.lightboxPanY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onLightboxPointerMove(event: PointerEvent): void {
    if (!this.lightboxDragging) return;
    this.lightboxPanX = this.lightboxPanStartX + (event.clientX - this.lightboxDragStartX);
    this.lightboxPanY = this.lightboxPanStartY + (event.clientY - this.lightboxDragStartY);
  }

  onLightboxPointerUp(): void {
    this.lightboxDragging = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.lightboxItem) return;
    if (event.key === 'Escape') this.closeLightbox();
    if (event.key === '+' || event.key === '=') this.lightboxZoomIn();
    if (event.key === '-') this.lightboxZoomOut();
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
          this.trending = [];
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
          this.manageItems = [];
          this.manageLoading = false;
        },
      });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(FeedPostDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'feed-post-dialog-panel',
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
      panelClass: 'feed-post-dialog-panel',
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