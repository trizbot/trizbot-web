import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { SignalsService } from './signals.service';
import { SignalFormDialogComponent } from './signal-form-dialog/signal-form-dialog.component';
import { SubscribeDialogComponent } from './subscribe-dialog/subscribe-dialog.component';
import {
  MySubscription,
  PLAN_LABELS,
  PlanOption,
  SIGNAL_TYPE_COLORS,
  SIGNAL_TYPE_LABELS,
  SignalItem,
  SubscriptionStatusEnum,
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
  private destroy$ = new Subject<void>();

  readonly typeLabels = SIGNAL_TYPE_LABELS;
  readonly typeColors = SIGNAL_TYPE_COLORS;
  readonly planLabels = PLAN_LABELS;

  activeTab: SignalsTab = 'signals';

  filterForm = new FormGroup({
    pair: new FormControl<string>(''),
  });

  // Signals list
  signals: SignalItem[] = [];
  signalsLoading = false;
  page = 1;
  limit = 12;
  total = 0;

  // Subscription state
  subscription: MySubscription | null = null;
  subscriptionLoading = false;

  // Plans
  plans: PlanOption[] = [];
  plansLoading = false;

  // Manage (admin)
  manageSignals: SignalItem[] = [];
  manageLoading = false;
  deletingId: string | null = null;

  constructor(private signalsService: SignalsService, private dialog: MatDialog) {}

  get isAdmin(): boolean {
    const entityName = localStorage.getItem('entity');
    return entityName === 'Admin';
  }

  get isSubscribed(): boolean {
    return !!this.subscription && this.subscription.status === SubscriptionStatusEnum.Active;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  ngOnInit(): void {
    this.loadSubscription();
    this.loadSignals();

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

    if (tab === 'plans' && this.plans.length === 0) {
      this.loadPlans();
    }

    if (tab === 'manage' && this.isAdmin && this.manageSignals.length === 0) {
      this.loadManageSignals();
    }
  }

  // ─── Subscription ────────────────────────────────────────

  loadSubscription(): void {
    this.subscriptionLoading = true;
    this.signalsService
      .mySubscription()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.subscription = res;
          this.subscriptionLoading = false;
        },
        error: () => {
          this.subscription = null;
          this.subscriptionLoading = false;
        },
      });
  }

  // ─── Signals ─────────────────────────────────────────────

  loadSignals(): void {
    this.signalsLoading = true;
    const { pair } = this.filterForm.getRawValue();

    this.signalsService
      .getSignals({ pair: pair || undefined, page: this.page, limit: this.limit })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.signals = res.items;
          this.total = res.total;
          this.signalsLoading = false;
        },
        error: () => {
          this.signalsLoading = false;
        },
      });
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

    ref.afterClosed().subscribe((subscribed) => {
      if (subscribed) {
        this.sharedService.showToast({ title: 'Subscription activated.' });
        this.loadSubscription();
        this.loadSignals();
      }
    });
  }

  // ─── Manage (admin) ──────────────────────────────────────

  loadManageSignals(): void {
    this.manageLoading = true;
    this.signalsService
      .getSignals({ page: 1, limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.manageSignals = res.items;
          this.manageLoading = false;
        },
        error: () => {
          this.manageLoading = false;
        },
      });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(SignalFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { mode: 'create' },
    });

    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.sharedService.showToast({ title: 'Signal created successfully.' });
        this.loadSignals();
        if (this.isAdmin) this.loadManageSignals();
      }
    });
  }

  openEditDialog(item: SignalItem): void {
    const ref = this.dialog.open(SignalFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { mode: 'edit', item },
    });

    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.sharedService.showToast({ title: 'Signal updated successfully.' });
        this.loadSignals();
        this.loadManageSignals();
      }
    });
  }

  deleteSignal(item: SignalItem): void {
    if (!confirm(`Delete "${item.pair}" signal? This cannot be undone.`)) return;

    this.deletingId = item.id;
    this.signalsService
      .deleteSignal(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.manageSignals = this.manageSignals.filter((i) => i.id !== item.id);
          this.sharedService.showToast({ title: 'Signal deleted.' });
          this.loadSignals();
        },
        error: () => {
          this.deletingId = null;
          this.sharedService.showToast({ title: 'Could not delete signal.' });
        },
      });
  }
}