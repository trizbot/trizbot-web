import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SignalCategoryEnum, SIGNAL_CATEGORY_LABELS } from './model/signal.model';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of, forkJoin } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { SignalsService } from './signals.service';
import { SignalFormDialogComponent } from './signal-form-dialog/signal-form-dialog.component';
import { SubscribeDialogComponent } from './subscribe-dialog/subscribe-dialog.component';

import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import {
  MySubscription,
  PLAN_LABELS,
  PlanOption,
  SIGNAL_TYPE_COLORS,
  SIGNAL_TYPE_LABELS,
  SignalItem,
  SignalListResponse,
  SUBSCRIPTION_PERIOD_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SubscriptionPeriodStatus,
  getSubscriptionPeriodStatus,
} from './model/signal.model';

type SignalsTab = 'signals' | 'plans' | 'manage';

@Component({
  selector: 'app-signals',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './signals.component.html',
  styleUrls: ['./signals.component.scss'],
})
export class SignalsComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private traderService = inject(TraderService);
  private destroy$ = new Subject<void>();

  /**
   * Every call to loadSignals() pushes here instead of calling the service
   * directly. Piped through switchMap below, so if multiple loads are
   * triggered in quick succession, only the response to the LATEST trigger
   * is ever applied — stale, out-of-order responses are dropped
   * automatically instead of racing to overwrite the signals list.
   */
  private reloadSignals$ = new Subject<void>();

  readonly typeLabels = SIGNAL_TYPE_LABELS;
  readonly typeColors = SIGNAL_TYPE_COLORS;
  readonly planLabels = PLAN_LABELS;
  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  readonly periodLabels = SUBSCRIPTION_PERIOD_LABELS;
  readonly getPeriodStatus = getSubscriptionPeriodStatus;
  readonly PeriodStatus = SubscriptionPeriodStatus;

  activeTab: SignalsTab = 'signals';

  readonly navItems: { tab: SignalsTab; label: string; icon: string; adminOnly?: boolean }[] = [
    { tab: 'signals', label: 'Signals', icon: 'show_chart' },
    { tab: 'plans', label: 'Plans', icon: 'workspace_premium' },
    { tab: 'manage', label: 'Manage', icon: 'settings', adminOnly: true },
  ];

  filterForm = new FormGroup({
    pair: new FormControl<string>(''),
  });

  // Signals list
  signals: SignalItem[] = [];
  signalsLoading = false;

  /**
   * Single source of truth for elevated access, resolved from the backend
   * via traderService.getTrader() (see ngOnInit). Do NOT derive this from
   * localStorage — that value can be stale or missing.
   */
  isSuperAdmin = false;

  /**
   * True until the initial access check (subscription + admin status,
   * resolved together via forkJoin) completes. The signals grid stays
   * hidden behind a loading spinner during this window instead of behind
   * two independently-resolving flags, which previously caused the grid to
   * flicker between "subscribe" and "grid" depending on which network call
   * happened to land first.
   */
  accessLoading = true;

  page = 1;
  limit = 12;
  total = 0;
  totalPages = 1;

  // Current active-by-date subscription (derived from history)
  subscription: MySubscription | null = null;
  subscriptionLoading = false;

  // Subscription history ("my subscriptions") — always loaded up front
  subscriptionHistory: MySubscription[] = [];
  subscriptionHistoryLoading = false;

  // Plans
  plans: PlanOption[] = [];
  plansLoading = false;

  // Manage (super admin)
  manageSignals: SignalItem[] = [];
  manageLoading = false;
  deletingId: string | null = null;

  constructor(private signalsService: SignalsService, private dialog: MatDialog) {}

  /** Super admins can manage (create/edit/delete) signals. */
  get canManageSignals(): boolean {
    return this.isSuperAdmin;
  }

  /**
   * Only super admins can browse the list without an active subscription.
   * Regular clients only see signals with an active subscription.
   */
  get canBypassSubscription(): boolean {
    return this.isSuperAdmin;
  }

  get isSubscribed(): boolean {
    return !!this.subscription && this.getPeriodStatus(this.subscription) === SubscriptionPeriodStatus.Active;
  }

  get visibleSubscriptionHistory(): MySubscription[] {
    const startOfToday = (d: Date) => {
      const c = new Date(d);
      c.setHours(0, 0, 0, 0);
      return c.getTime();
    };

    const today = startOfToday(new Date());

    return this.subscriptionHistory.filter((s) => {
      const expiry = startOfToday(new Date(s.expiresAt));
      return expiry !== today;
    });
  }

  ngOnInit(): void {
    // Single pipeline for all signal-list loads. switchMap guarantees that
    // only the most recently triggered request's response is ever applied,
    // regardless of network timing.
    this.reloadSignals$
      .pipe(
        switchMap(() => {
          this.signalsLoading = true;
          const { pair } = this.filterForm.getRawValue();

          const params: Record<string, unknown> = {
            pair: pair || undefined,
            page: this.page,
            limit: this.limit,
          };

          if (this.canBypassSubscription) {
            params['bypassSubscription'] = true;
          }

          return this.signalsService.getSignals(params as any).pipe(
            catchError(() => of(null as SignalListResponse | null))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        this.signalsLoading = false;
        if (!res) {
          return;
        }
        this.signals = res.items;
        this.total = res.total;
        this.totalPages = res.totalPages;
      });

    // Resolve subscription status AND admin status TOGETHER before the
    // signals grid is ever shown or hidden — this is what actually fixes
    // the "waits until something else happens" symptom. Previously these
    // were two independent async calls, so the template's *ngIf could
    // flicker through "subscribe to unlock" before finally settling once
    // both had resolved. Now there's exactly one settling point.
    this.subscriptionLoading = true;
    this.subscriptionHistoryLoading = true;

    forkJoin({
      subscriptions: this.signalsService.getMySubscriptions().pipe(
        catchError(() => of([] as MySubscription[]))
      ),
      trader: this.traderService.getTrader().pipe(
        catchError(() => of(null as GetTraderResBody | null))
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ subscriptions, trader }) => {
        const sorted = [...subscriptions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.subscriptionHistory = sorted;
        this.subscription =
          sorted.find((s) => this.getPeriodStatus(s) === SubscriptionPeriodStatus.Active) ?? null;

        this.isSuperAdmin = !!trader?.data?.isSuperAdmin;

        this.subscriptionLoading = false;
        this.subscriptionHistoryLoading = false;
        this.accessLoading = false;

        // Load the signals list exactly once, right here — the same
        // settling point used for subscription history above. isSuperAdmin
        // is already known by this line, so canBypassSubscription is
        // correct on this very first request: admins always get the full,
        // bypassed list on the first try, with no earlier/partial request
        // to race against and no flash of an empty grid.
        this.loadSignals();

        if (this.activeTab === 'manage' && !this.isSuperAdmin) {
          this.activeTab = 'signals';
        }

        // Always (re)load the manage list once admin status is known —
        // not gated on manageSignals.length === 0. On a fresh page load
        // manageSignals is always empty anyway, so this fires exactly
        // once here; it also means a hard reload while already on the
        // Manage tab reliably repopulates from the server instead of
        // silently staying empty.
        if (this.activeTab === 'manage' && this.isSuperAdmin) {
          this.loadManageSignals();
        }
      });

    this.loadPlans();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadSignals();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: SignalsTab): void {
    if (tab === 'manage' && !this.isSuperAdmin) return;

    this.activeTab = tab;

    if (tab === 'plans') {
      this.loadPlans();
      this.loadSubscriptions();
    }

    if (tab === 'manage' && this.isSuperAdmin) {
      this.loadManageSignals();
    }
  }

  // ─── Subscription ────────────────────────────────────────
  /**
   * Re-fetches subscription history on demand (e.g. after subscribing, or
   * switching to the Plans tab). The initial load is handled by the
   * forkJoin in ngOnInit — this is for subsequent refreshes only.
   */
  loadSubscriptions(): void {
    this.subscriptionLoading = true;
    this.subscriptionHistoryLoading = true;

    this.signalsService
      .getMySubscriptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          const sorted = [...history].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          this.subscriptionHistory = sorted;
          this.subscription =
            sorted.find((s) => this.getPeriodStatus(s) === SubscriptionPeriodStatus.Active) ?? null;
          this.subscriptionLoading = false;
          this.subscriptionHistoryLoading = false;

          this.loadSignals();
        },
        error: () => {
          this.subscriptionLoading = false;
          this.subscriptionHistoryLoading = false;
        },
      });
  }

  // ─── Signals ─────────────────────────────────────────────

  /** Triggers a (re)load through the switchMap pipeline set up in ngOnInit. */
  loadSignals(): void {
    this.reloadSignals$.next();
  }

  clearFilters(): void {
    this.filterForm.reset({ pair: '' });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadSignals();
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

  riskReward(item: SignalItem): string | null {
    if (item.targetPrice == null || item.stopLoss == null) return null;
    const reward = Math.abs(item.targetPrice - item.entryPrice);
    const risk = Math.abs(item.entryPrice - item.stopLoss);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
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

  // ─── Plans ───────────────────────────────────────────────

  loadPlans(): void {
    this.plansLoading = true;
    this.signalsService
      .getPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.plans = res;
          this.plansLoading = false;
        },
        error: () => {
          this.plansLoading = false;
        },
      });
  }

  openSubscribeDialog(plan: PlanOption): void {
    const ref = this.dialog.open(SubscribeDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: { plan },
    });

    ref.afterClosed().subscribe((created: MySubscription | null | undefined) => {
      if (!created) return;

      this.sharedService.showToast({ title: 'Subscription activated.' });

      // Refetch from the server instead of trusting the dialog payload as
      // final truth — keeps this list identical to what a reload will show.
      this.loadSubscriptions();
    });
  }

  // ─── Manage (super admin) ────────────────────────────────

  /**
   * Always fetches the canonical list from the backend and sorts it
   * newest-first client-side. Sorting here (rather than assuming the API
   * already orders by createdAt) is what stops a freshly created signal
   * from getting buried past the fetch limit or appearing "missing" simply
   * because it landed lower in an unsorted response.
   */
  loadManageSignals(): void {
    if (!this.isSuperAdmin) return;

    this.manageLoading = true;
    this.signalsService
      .getSignals({ page: 1, limit: 100, bypassSubscription: this.canBypassSubscription || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.manageSignals = [...res.items].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.manageLoading = false;
        },
        error: () => {
          this.manageLoading = false;
        },
      });
  }

  openCreateDialog(): void {
    if (!this.canManageSignals) return;

    const ref = this.dialog.open(SignalFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { mode: 'create' },
    });

    ref.afterClosed().subscribe((created: SignalItem | null | undefined) => {
      if (!created) return;

      this.sharedService.showToast({ title: 'Signal created successfully.' });

      // Re-fetch both lists from the backend rather than only splicing the
      // dialog's returned object into local arrays. Splicing alone makes
      // the create *look* successful in the current session even if the
      // save didn't actually persist — the signal would then vanish on the
      // next reload with no indication anything was wrong. Reloading here
      // surfaces that immediately: if it's not in the refetched list, the
      // create didn't really persist server-side.
      this.loadManageSignals();
      this.page = 1;
      this.loadSignals();
    });
  }

  openEditDialog(item: SignalItem): void {
    if (!this.canManageSignals) return;

    const ref = this.dialog.open(SignalFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { mode: 'edit', item },
    });

    ref.afterClosed().subscribe((updated: SignalItem | null | undefined) => {
      if (!updated) return;

      this.sharedService.showToast({ title: 'Signal updated successfully.' });

      // Same reasoning as create: confirm against the server rather than
      // trusting the dialog's return value as final.
      this.loadManageSignals();
      this.loadSignals();
    });
  }

  deleteSignal(item: SignalItem): void {
    if (!this.canManageSignals) return;
    if (!confirm(`Delete "${item.pair}" signal? This cannot be undone.`)) return;

    this.deletingId = item.id;
    this.signalsService
      .deleteSignal(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.manageSignals = this.manageSignals.filter((i) => i.id !== item.id);
          this.signals = this.signals.filter((i) => i.id !== item.id);
          this.total = Math.max(0, this.total - 1);
          this.sharedService.showToast({ title: 'Signal deleted.' });
        },
        error: () => {
          this.deletingId = null;
          this.sharedService.showToast({ title: 'Could not delete signal.' });
        },
      });
  }

  readonly categoryLabels = SIGNAL_CATEGORY_LABELS;

  readonly categoryColors: Record<SignalCategoryEnum, string> = {
    [SignalCategoryEnum.Futures]: '#7b61ff',
    [SignalCategoryEnum.Spot]: '#2e7d32',
  };

  takeProfitSummary(item: SignalItem): string {
    const levels: string[] = [];
    if (item.takeProfit1 != null) levels.push(`TP1: ${item.takeProfit1}`);
    if (item.takeProfit2 != null) levels.push(`TP2: ${item.takeProfit2}`);
    if (item.takeProfit3 != null) levels.push(`TP3: ${item.takeProfit3}`);
    return levels.length ? levels.join(' / ') : '—';
  }

  trackById(_: number, item: SignalItem): string {
    return item.id;
  }
}