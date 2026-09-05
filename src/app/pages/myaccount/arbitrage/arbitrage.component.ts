import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, interval } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { ArbitrageService } from './arbitrage.service';
import { PlaceTradeDialogComponent } from './place-trade-dialog/place-trade-dialog.component';
import {
  SubscribePromptDialogComponent,
  SubscribePromptDialogData,
  SubscribePromptPlan,
} from './subscribe-dialog/subscribe-prompt-dialog.component';
import {
  ArbitrageOpportunity,
  EXCHANGE_CONFIG,
  EXCHANGE_IDS,
  ExchangeConfig,
} from './model/arbitrage.model';

import { TraderService } from '../../../appstate/trader.service';
import { GetTraderResBody } from '../../../services/auth.type';
import {
  ARBITRAGE_SUBSCRIPTION_PLANS,
  MyArbitrageSubscription,
  ArbitrageSubscriptionPlan,
  getArbitrageSubscriptionPeriodStatus,
  ArbitrageSubscriptionPeriodStatus,
} from './model/arbitrage-subscription.model';

const AUTO_REFRESH_SECONDS = 20;
const PAGE_SIZE_OPTIONS = [5, 10, 15, 25, 20, 30, 35, 40, 50] as const;

// Opportunities with an estimated profit above this are considered
// "premium" and gated behind an active subscription. Anything at or
// below this threshold is visible in the free preview.
const FREE_PREVIEW_PROFIT_CEILING = 1;

@Component({
  selector: 'app-arbitrage',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './arbitrage.component.html',
  styleUrls: ['./arbitrage.component.scss'],
})
export class ArbitrageComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private traderService = inject(TraderService);
  private destroy$ = new Subject<void>();

  readonly exchangeIds = EXCHANGE_IDS;
  readonly exchangeConfig = EXCHANGE_CONFIG;
  readonly refreshIntervalSeconds = AUTO_REFRESH_SECONDS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly arbSubscriptionPlans = ARBITRAGE_SUBSCRIPTION_PLANS;

  tokenOptions: string[] = [];
  private knownTokens = new Set<string>();

  activeExchange: string = EXCHANGE_IDS[0];

  filterForm = new FormGroup({
    token: new FormControl<string>(''),
    minSpreadPercent: new FormControl<number | null>(null),
  });

  allOpportunities: ArbitrageOpportunity[] = [];
  loading = false;
  error: string | null = null;
  lastUpdated: Date | null = null;
  secondsToRefresh = AUTO_REFRESH_SECONDS;

  // --- Pagination state ---
  currentPage = 1;
  pageSize: number = PAGE_SIZE_OPTIONS[1]; // default 25

  // ---------------------------------------------------------------------
  // Entitlement state — resolved from the same trader fetch, same as
  // WalletBalanceComponent. No separate "locked panel" wall: once the
  // trader record resolves, the full arbitrage experience renders and
  // individual high-profit rows are gated via isSpreadLocked().
  // ---------------------------------------------------------------------
  isSuperAdmin = false;
  arbitrageSubscriptionLoading = true;
  activeArbitrageSubscription: MyArbitrageSubscription | null = null;
  hasActiveArbitrageSubscription = false;

  // Global arbitrade-market status/metadata for this trader. This is
  // independent of the paid opportunities subscription above.
  arbitradeStatus = false;
  arbitradeState = '';
  arbitradeExpiry = '';

  countdownToArbExpiry = '';
  private arbCountdownSub: Subscription | null = null;

  private traderResolved = false;
  private arbBootstrapped = false;

  /**
   * Whether the trader is entitled to see *premium* (high-profit)
   * arbitrage rows. This is purely a subscription/entitlement check —
   * it must never be derived from `arbitradeStatus`, which is an
   * unrelated market-state flag.
   */
  get canViewArbitrage(): boolean {
    return this.isSuperAdmin || this.hasActiveArbitrageSubscription;
  }

  get arbSubscriptionPlanList(): { key: ArbitrageSubscriptionPlan; label: string; price: number; durationDays: number }[] {
    return (Object.keys(this.arbSubscriptionPlans) as ArbitrageSubscriptionPlan[]).map((key) => ({
      key,
      ...this.arbSubscriptionPlans[key],
    }));
  }

  constructor(
    private arbitrageService: ArbitrageService,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.getCurrentTrader();

    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.secondsToRefresh -= 1;
        if (this.secondsToRefresh <= 0) {
          this.secondsToRefresh = AUTO_REFRESH_SECONDS;
          this.loadOpportunities(true);
        }
      });

    this.filterForm.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.arbCountdownSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentTrader(): void {
    this.arbitrageSubscriptionLoading = true;

    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.isSuperAdmin = res.data.isSuperAdmin;
        this.arbitradeStatus = res.data.arbitradeStatus ?? false;
        this.arbitradeState = res.data.arbitradeState ?? 'Active';
        this.arbitradeExpiry = res.data.arbitradeExpiry ?? '';

        const rawSub = (res.data as any).arbitrageSubscription as MyArbitrageSubscription | null;
        this.activeArbitrageSubscription =
          rawSub && getArbitrageSubscriptionPeriodStatus(rawSub) === ArbitrageSubscriptionPeriodStatus.Active
            ? rawSub
            : null;
        this.hasActiveArbitrageSubscription = !!this.activeArbitrageSubscription;

        this.arbitrageSubscriptionLoading = false;
        this.traderResolved = true;
        this.restartArbCountdown();
        this.maybeLoadOpportunities();
      },
      error: () => {
        this.traderResolved = true;
        this.arbitrageSubscriptionLoading = false;
        this.hasActiveArbitrageSubscription = false;
        this.activeArbitrageSubscription = null;
        this.countdownToArbExpiry = '';
      },
    });
  }

  checkAccess(): void {
    this.getCurrentTrader();
  }

  checkArbitrageSubscriptionRetry(): void {
    this.getCurrentTrader();
  }

  private maybeLoadOpportunities(): void {
    if (this.arbBootstrapped) return;
    if (!this.traderResolved || this.arbitrageSubscriptionLoading) return;

    this.arbBootstrapped = true;
    this.loadOpportunities();
  }

  /**
   * Free users can see low-profit rows; anything above the free-preview
   * ceiling requires an active subscription (or super-admin).
   */
  isSpreadLocked(o: { estimatedProfit: number | null }): boolean {
    if (this.canViewArbitrage) return false;
    return (o.estimatedProfit ?? 0) > FREE_PREVIEW_PROFIT_CEILING;
  }

  private restartArbCountdown(): void {
    this.arbCountdownSub?.unsubscribe();
    this.arbCountdownSub = null;
    this.countdownToArbExpiry = '';

    if (!this.activeArbitrageSubscription) return;

    this.arbCountdownSub = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.tickArbCountdown());

    this.tickArbCountdown();
  }

  private tickArbCountdown(): void {
    if (!this.activeArbitrageSubscription) {
      this.countdownToArbExpiry = '';
      return;
    }

    const endTime = new Date(this.activeArbitrageSubscription.endDate).getTime();
    const remaining = endTime - Date.now();

    if (remaining <= 0) {
      this.countdownToArbExpiry = 'Expired';
      this.onArbSubscriptionExpired();
      return;
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    const seconds = Math.floor((remaining / 1000) % 60);
    this.countdownToArbExpiry = `${days}d ${this.pad(hours)}h ${this.pad(minutes)}m ${this.pad(seconds)}s`;
  }

  private onArbSubscriptionExpired(): void {
    if (!this.hasActiveArbitrageSubscription) return;

    this.hasActiveArbitrageSubscription = false;
    this.activeArbitrageSubscription = null;
    this.currentPage = 1;
    this.arbCountdownSub?.unsubscribe();
    this.arbCountdownSub = null;

    this.sharedService.showToast({ title: 'Your arbitrage subscription has expired.' });
    this.getCurrentTrader();
  }

  private pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  openArbitrageSubscribePrompt(): void {
    this.openSubscribeDialog('bolt');
  }

  openArbitrageSubscribeDialog(): void {
    this.openSubscribeDialog('lock_open');
  }

  private openSubscribeDialog(icon: string): void {
    const plansList = this.arbSubscriptionPlanList;
    if (plansList.length === 0) return;

    const bestValue = plansList.reduce((best, p) =>
      p.price / p.durationDays < best.price / best.durationDays ? p : best,
    plansList[0]);

    const plans: SubscribePromptPlan[] = plansList.map((plan) => ({
      key: plan.key,
      label: plan.label,
      price: plan.price,
      durationDays: plan.durationDays,
      recommended: plan.key === bestValue.key,
    }));

    const data: SubscribePromptDialogData = {
      title: 'Unlock the arbitrage scanner',
      description:
        'Cross-exchange arbitrage opportunities are only visible to subscribers. Choose a plan below to unlock live pricing, profit estimates, and one-click trading.',
      icon,
      mode: 'plans',
      plans,
      onSubscribe: (planKey: string) => this.arbitrageService.subscribe(planKey as ArbitrageSubscriptionPlan),
    };

    const ref = this.dialog.open(SubscribePromptDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      panelClass: 'spd-dialog-panel',
      data,
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.subscribed) {
        this.sharedService.showToast({ title: `Arbitrage ${result.plan} subscription activated.` });
        this.getCurrentTrader();
      }
    });
  }

  // =========================================================================
  // ARBITRAGE — opportunities table
  // =========================================================================

  get activeConfig(): ExchangeConfig {
    return this.exchangeConfig[this.activeExchange];
  }

  selectExchange(id: string): void {
    if (this.activeExchange === id) return;
    this.activeExchange = id;
    this.currentPage = 1;
  }

  get visibleOpportunities(): ArbitrageOpportunity[] {
    return this.allOpportunities
      .filter((o) => o.buyExchange === this.activeExchange || o.sellExchange === this.activeExchange)
      .sort((a, b) => b.spreadPercent - a.spreadPercent);
  }

  get pagedOpportunities(): ArbitrageOpportunity[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.visibleOpportunities.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.visibleOpportunities.length / this.pageSize));
  }

  get pageRangeStart(): number {
    if (this.visibleOpportunities.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageRangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.visibleOpportunities.length);
  }

  get pageNumbers(): (number | '…')[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, total, current, current - 1, current + 1]);
    const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const result: (number | '…')[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) result.push('…');
      result.push(p);
      prev = p;
    }
    return result;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  changePageSize(size: number): void {
    if (size === this.pageSize) return;
    this.pageSize = size;
    this.currentPage = 1;
  }

  isActiveBuyLeg(o: ArbitrageOpportunity): boolean {
    return o.buyExchange === this.activeExchange;
  }

  counterpartyId(o: ArbitrageOpportunity): string {
    return this.isActiveBuyLeg(o) ? o.sellExchange : o.buyExchange;
  }

  counterpartyLabel(o: ArbitrageOpportunity): string {
    const id = this.counterpartyId(o);
    return this.exchangeConfig[id]?.label ?? id;
  }

  counterpartyColor(o: ArbitrageOpportunity): string {
    const id = this.counterpartyId(o);
    return this.exchangeConfig[id]?.colorPrimary ?? '#999999';
  }

  activePriceFor(o: ArbitrageOpportunity): number | null {
    return this.isActiveBuyLeg(o) ? o.buyPrice : o.sellPrice;
  }

  counterpartyPriceFor(o: ArbitrageOpportunity): number | null {
    return this.isActiveBuyLeg(o) ? o.sellPrice : o.buyPrice;
  }

  spreadTier(spreadPercent: number): 'high' | 'medium' | 'low' {
    if (spreadPercent >= 1.5) return 'high';
    if (spreadPercent >= 0.5) return 'medium';
    return 'low';
  }

  trackByOpportunity(_index: number, o: ArbitrageOpportunity): string {
    return `${o.token}-${o.buyExchange}-${o.sellExchange}`;
  }

  loadOpportunities(silent = false): void {
    if (!silent) this.loading = true;
    this.error = null;
    const { token, minSpreadPercent } = this.filterForm.getRawValue();

    this.arbitrageService
      .getOpportunities({
        token: token || undefined,
        minSpreadPercent: minSpreadPercent ?? undefined,
        limit: 100,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.allOpportunities = res;
          this.updateTokenOptions(res);
          if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
          }
          this.loading = false;
          this.error = null;
          this.lastUpdated = new Date();
        },
        error: () => {
          this.loading = false;
          this.error = 'Could not load arbitrage opportunities. Please try again.';
        },
      });
  }

  private updateTokenOptions(opportunities: ArbitrageOpportunity[]): void {
    let changed = false;
    for (const o of opportunities) {
      if (!this.knownTokens.has(o.token)) {
        this.knownTokens.add(o.token);
        changed = true;
      }
    }
    if (changed) {
      this.tokenOptions = Array.from(this.knownTokens).sort();
    }
  }

  refreshNow(): void {
    this.secondsToRefresh = AUTO_REFRESH_SECONDS;
    this.loadOpportunities();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadOpportunities();
  }

  openTradeDialog(o: ArbitrageOpportunity): void {
    if (this.isSpreadLocked(o)) {
      this.openArbitrageSubscribePrompt();
      return;
    }

    const ref = this.dialog.open(PlaceTradeDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'bybit-dialog-panel',
      data: {
        opportunity: o,
        activeExchange: this.activeExchange,
        buyConfig: this.exchangeConfig[o.buyExchange],
        sellConfig: this.exchangeConfig[o.sellExchange],
      },
    });

    ref.afterClosed().subscribe((placed) => {
      if (placed) {
        this.sharedService.showToast({ title: 'Trade executed successfully.' });
        this.loadOpportunities(true);
      }
    });
  }
}