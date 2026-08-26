import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SignalCategoryEnum, SIGNAL_CATEGORY_LABELS } from './model/signal.model';
import { MatDialog } from '@angular/material/dialog';
import { Subject, forkJoin, of } from 'rxjs';
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

// Manage tab is gone — admins get everything on the Signals tab itself.
type SignalsTab = 'signals' | 'plans';

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


  private reloadSignals$ = new Subject<void>();

  readonly typeLabels = SIGNAL_TYPE_LABELS;
  readonly typeColors = SIGNAL_TYPE_COLORS;
  readonly planLabels = PLAN_LABELS;
  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  readonly periodLabels = SUBSCRIPTION_PERIOD_LABELS;
  readonly getPeriodStatus = getSubscriptionPeriodStatus;
  readonly PeriodStatus = SubscriptionPeriodStatus;
  readonly categoryLabels = SIGNAL_CATEGORY_LABELS;

  readonly categoryColors: Record<SignalCategoryEnum, string> = {
    [SignalCategoryEnum.Futures]: '#7b61ff',
    [SignalCategoryEnum.Spot]: '#2e7d32',
  };

  activeTab: SignalsTab = 'signals';

  readonly navItems: { tab: SignalsTab; label: string; icon: string }[] = [
    { tab: 'signals', label: 'Signals', icon: 'show_chart' },
    { tab: 'plans', label: 'Plans', icon: 'workspace_premium' },
  ];

  filterForm = new FormGroup({
    pair: new FormControl<string>(''),
  });


  signals: SignalItem[] = [];
  signalsLoading = false;
  deletingId: string | null = null;

 
  isSuperAdmin = false;


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

  constructor(private signalsService: SignalsService, private dialog: MatDialog) {}

  /** Admins can create/edit/delete signals. */
  get canManageSignals(): boolean {
    return this.isSuperAdmin;
  }

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
            // params['bypassSubscription'] = true;
          }

          return this.signalsService.getSignals(params as any).pipe(
            catchError(() => of(null as SignalListResponse | null))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        this.signalsLoading = false;
        if (!res) return;
        this.signals = res.items;
        this.total = res.total;
        this.totalPages = res.totalPages;
      });

 
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

        this.isSuperAdmin = trader?.data?.isSuperAdmin ?? false;

        this.subscriptionLoading = false;
        this.subscriptionHistoryLoading = false;
        this.accessLoading = false;

        
        this.loadSignals();
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
    this.activeTab = tab;

    if (tab === 'plans') {
      this.loadPlans();
      this.loadSubscriptions();
    }
  }

  // ─── Subscription ────────────────────────────────────────
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
      this.loadSubscriptions();
    });
  }

  // ─── Manage (admin) — now lives inline on the Signals tab ───
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
}