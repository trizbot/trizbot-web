import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { FeedService } from './feed.service';
import { FeedPostDialogComponent } from './feed-post-dialog/feed-post-dialog.component';
import { FeedCategoryItem, FeedItem } from './model/feed.model';
import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../app/services/auth.type';

type FeedTab = 'feed' | 'manage' | 'categories';

const MIN_LIGHTBOX_ZOOM = 1;
const MAX_LIGHTBOX_ZOOM = 4;
const LIGHTBOX_ZOOM_STEP = 0.25;

/**
 * Deterministic fallback palette for category accent colors.
 *
 * Categories are now fully API-driven (see `categories`, loaded from
 * FeedService.getFeedCategory()) — there is no more static color/label map
 * keyed off a fixed enum. Each category *name* is hashed to a stable index
 * into this palette, so the same category name always renders with the same
 * accent color without the UI needing to know category names in advance.
 * This is purely presentational — it never affects filtering or matching.
 */
const CATEGORY_COLOR_PALETTE = [
  '#5B8DEF', '#F5A623', '#8E7CFF', '#EA3943', '#16C784',
  '#EF7BD8', '#2DD4BF', '#F97316', '#A855F7', '#22C55E',
];

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

  /**
   * SINGLE SOURCE OF TRUTH for write access (create / update / delete,
   * including feed-category management). Resolved server-side via
   * TraderService.getTrader() — never derived from localStorage or anything
   * else the client can tamper with. Every create/edit/delete/manage entry
   * point in this component (and the child dialog) checks this flag.
   * Regular (non-super-admin) users are strictly read-only: they can browse
   * "Feed" but never see or reach "Manage" / "Categories" or any mutating
   * action.
   *
   * NOTE: this only hides/blocks actions in the UI. The backend must also
   * reject create/update/delete requests from non-super-admins —
   * client-side gating is a UX convenience, not a security boundary.
   */
  isSuperAdmin = false;

  activeTab: FeedTab = 'feed';

  /** Currently selected category *name* from the button navigation ('' = All) */
  activeCategory = '';

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

  // Manage (super-admin only)
  manageItems: FeedItem[] = [];
  manageLoading = false;
  deletingId: string | null = null;

  // ── Feed Categories ─────────────────────────────────────────
  // `categories` is loaded once from the API for EVERY visitor — it powers
  // both the public category filter nav on the "Feed" tab and (for
  // super-admins only) the CRUD list on the "Categories" tab. There is no
  // static fallback list anymore; if the API returns nothing, the nav only
  // shows "All".
  categories: FeedCategoryItem[] = [];
  categoriesLoading = false;
  savingCategory = false;
  categoryError: string | null = null;
  deletingCategoryId: string | null = null;
  /** id of the category currently being edited, or null when adding new */
  editingCategoryId: string | null = null;

  categoryForm = new FormGroup({
    category: new FormControl<string>('', [Validators.required, Validators.maxLength(60)]),
  });

  private categoryColorCache = new Map<string, string>();

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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get lightboxZoomPercent(): string {
    return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 }).format(
      this.lightboxZoom,
    );
  }

  get canLightboxZoomIn(): boolean {
    return this.lightboxZoom < MAX_LIGHTBOX_ZOOM;
  }

  get canLightboxZoomOut(): boolean {
    return this.lightboxZoom > MIN_LIGHTBOX_ZOOM;
  }

  ngOnInit(): void {
    this.loadItems();
    this.loadCategories();
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
          this.isSuperAdmin = res.data?.isSuperAdmin;

          if (!this.isSuperAdmin && (this.activeTab === 'manage' || this.activeTab === 'categories')) {
            this.activeTab = 'feed';
          }
        },
        error: () => {
          // Fail closed: isSuperAdmin stays false if this lookup fails,
          // and any admin-only tab view bounces back to read-only feed.
          this.isSuperAdmin = false;
          if (this.activeTab === 'manage' || this.activeTab === 'categories') {
            this.activeTab = 'feed';
          }
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: FeedTab): void {
    // 'manage' and 'categories' are super-admin-only surfaces. A
    // non-super-admin can never land on them, even by manipulating the
    // DOM to click a hidden button.
    if ((tab === 'manage' || tab === 'categories') && !this.isSuperAdmin) {
      return;
    }

    this.activeTab = tab;

    if (tab === 'manage' && this.manageItems.length === 0) {
      this.loadManageItems();
    }

    if (tab === 'categories' && this.categories.length === 0) {
      this.loadCategories();
    }
  }

  // ─── All Feed (read-only for everyone) ───────────────────────

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

  /** Button-based category navigation, driven entirely by the live `categories` list. Pass '' for "All". */
  filterByCategory(category: string): void {
    const next = category || '';
    if (next === this.activeCategory) return;
    this.activeCategory = next;
    this.page = 1;
    this.loadItems();
  }

  hasActiveFilters(): boolean {
    const { search, coinSymbol } = this.filterForm.getRawValue();
    return !!(search || coinSymbol || this.activeCategory);
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

  // ─── International formatting helpers ────────────────────────
  // All formatting below relies on the runtime's Intl APIs with no
  // hard-coded locale, so dates, numbers, currency and relative times
  // automatically render in whichever locale/region the visitor's browser
  // is set to (no manual locale strings scattered through the template).

  /** Locale-aware relative time, e.g. "2 hours ago" / "il y a 2 heures". */
  timeAgo(item: FeedItem): string {
    const date = item.publishedAt || item.createdAt;
    const then = new Date(date).getTime();
    const seconds = Math.floor((Date.now() - then) / 1000);

    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
      { amount: 60, unit: 'seconds' },
      { amount: 60, unit: 'minutes' },
      { amount: 24, unit: 'hours' },
      { amount: 7, unit: 'days' },
      { amount: 4.345, unit: 'weeks' },
      { amount: 12, unit: 'months' },
      { amount: Number.POSITIVE_INFINITY, unit: 'years' },
    ];

    let duration = seconds;
    for (const division of divisions) {
      if (Math.abs(duration) < division.amount) {
        return rtf.format(-Math.round(duration), division.unit);
      }
      duration /= division.amount;
    }
    return rtf.format(-Math.round(duration), 'years');
  }

  /** Locale-aware absolute date/time — used as a hover title and in the Manage table. */
  fullDate(item: FeedItem): string {
    const date = item.publishedAt || item.createdAt;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  }

  /** Locale-aware currency formatting for the parsed price stat (source data is USD). */
  formatPrice(price?: string): string {
    if (!price) return '';
    const value = parseFloat(price.replace(/,/g, ''));
    if (Number.isNaN(value)) return price;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
  }

  /** Locale-aware percentage formatting for the parsed 24h change stat. */
  formatPercent(changePercent?: number): string {
    if (changePercent === undefined || changePercent === null) return '';
    return new Intl.NumberFormat(undefined, {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: 'exceptZero',
    }).format(changePercent / 100);
  }

  trackByItemId(_index: number, item: FeedItem): string {
    return item.id;
  }

  trackByCategoryId(_index: number, item: FeedCategoryItem): string {
    return item.id;
  }

  // ─── Category accent color (presentational only, not backend data) ─
  getCategoryColor(category?: string): string {
    if (!category) return CATEGORY_COLOR_PALETTE[0];
    const cached = this.categoryColorCache.get(category);
    if (cached) return cached;

    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = CATEGORY_COLOR_PALETTE[Math.abs(hash) % CATEGORY_COLOR_PALETTE.length];
    this.categoryColorCache.set(category, color);
    return color;
  }

  // ─── Detail lightbox (view-only, available to everyone) ─────

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

  // ─── Manage (super-admin only: create / edit / delete posts) ─

  loadManageItems(): void {
    if (!this.isSuperAdmin) return;

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
    if (!this.isSuperAdmin) return;

    const ref = this.dialog.open(FeedPostDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'feed-post-dialog-panel',
      // Live category list is passed through so the dialog's category
      // picker is API-driven too, instead of a hard-coded enum.
      data: { mode: 'create', categories: this.categories },
    });

    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.sharedService.showToast({ title: 'Post created successfully.' });
        this.loadItems();
        this.loadManageItems();
      }
    });
  }

  openEditDialog(item: FeedItem): void {
    if (!this.isSuperAdmin) return;

    const ref = this.dialog.open(FeedPostDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'feed-post-dialog-panel',
      data: { mode: 'edit', item, categories: this.categories },
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
    if (!this.isSuperAdmin) return;
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

  // ─── Feed Categories (API-driven; create / edit / delete gated to super-admin) ─

  loadCategories(): void {
    this.categoriesLoading = true;
    this.feedService
      .getFeedCategory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

  /** Populates the form for editing an existing category. */
  startEditCategory(item: FeedCategoryItem): void {
    if (!this.isSuperAdmin) return;
    this.editingCategoryId = item.id;
    this.categoryError = null;
    this.categoryForm.setValue({ category: item.category });
  }

  /** Clears the form back to "add new" mode. */
  cancelCategoryEdit(): void {
    this.editingCategoryId = null;
    this.categoryError = null;
    this.categoryForm.reset({ category: '' });
  }

  /** Single submit handler for both create and update — routes on editingCategoryId. */
  saveCategory(): void {
    if (!this.isSuperAdmin) return;

    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const name = (this.categoryForm.getRawValue().category ?? '').trim();
    if (!name) return;

    this.savingCategory = true;
    this.categoryError = null;

    const wasEditing = this.editingCategoryId;
    const request$ = wasEditing
      ? this.feedService.updateFeedCategory(wasEditing, { category: name })
      : this.feedService.createFeedCategory({ category: name });

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.categories = res;
        this.savingCategory = false;
        this.sharedService.showToast({
          title: wasEditing ? 'Category updated.' : 'Category created.',
        });
        this.cancelCategoryEdit();
      },
      error: (err) => {
        this.savingCategory = false;
        const backendMessage = err?.error?.message;
        this.categoryError =
          (Array.isArray(backendMessage) ? backendMessage.join(' ') : backendMessage) ||
          'Could not save category. Please try again.';
      },
    });
  }

  deleteCategoryItem(item: FeedCategoryItem): void {
    if (!this.isSuperAdmin) return;
    if (!confirm(`Delete category "${item.category}"? This cannot be undone.`)) return;

    this.deletingCategoryId = item.id;
    this.feedService
      .deleteFeedCategory(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingCategoryId = null;
          this.categories = this.categories.filter((c) => c.id !== item.id);
          // If the currently active feed filter was this category, clear it
          // so the "All Feed" tab never ends up filtered on a category that
          // no longer exists.
          if (this.activeCategory === item.category) {
            this.activeCategory = '';
            this.loadItems();
          }
          this.sharedService.showToast({ title: 'Category deleted.' });
          // If the deleted category was mid-edit, reset the form.
          if (this.editingCategoryId === item.id) {
            this.cancelCategoryEdit();
          }
        },
        error: () => {
          this.deletingCategoryId = null;
          this.sharedService.showToast({ title: 'Could not delete category.' });
        },
      });
  }
}