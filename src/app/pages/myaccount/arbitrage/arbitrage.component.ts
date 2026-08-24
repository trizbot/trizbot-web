import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { Subject, interval } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { ArbitrageService } from './arbitrage.service';
import { PlaceTradeDialogComponent } from './place-trade-dialog/place-trade-dialog.component';
import {
  SubscribePromptDialogComponent,
  SubscribePromptDialogData,
} from './subscribe-dialog/subscribe-prompt-dialog.component';
import {
  ArbitrageOpportunity,
  EXCHANGE_CONFIG,
  EXCHANGE_IDS,
  ExchangeConfig,
} from './model/arbitrage.model';

// Subscription gate deps — mirrors the same rule used on the merged
// dashboard view: the scanner unlocks with an active Signals subscription,
// or automatically for super admins.
import { TraderService } from '../../../appstate/trader.service';
import { GetTraderResBody } from '../../../services/auth.type';
import { SignalsService } from '../signals/signals.service';
import {
  MySubscription,
  SubscriptionPeriodStatus,
  getSubscriptionPeriodStatus,
} from '../signals/model/signal.model';

const AUTO_REFRESH_SECONDS = 20;
const PAGE_SIZE_OPTIONS = [5,10,15, 25,20,30,35,40, 50] as const;


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
  private signalsService = inject(SignalsService);
  private destroy$ = new Subject<void>();

  readonly exchangeIds = EXCHANGE_IDS;
  readonly exchangeConfig = EXCHANGE_CONFIG;
  readonly refreshIntervalSeconds = AUTO_REFRESH_SECONDS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;


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
  // Access gate — requires an active Signals subscription (or super admin)
  // ---------------------------------------------------------------------
  isSuperAdmin = false;
  hasActiveSignalSubscription = false;
  signalSubscriptionLoading = true;
  activeSignalSubscription: MySubscription | null = null;

  private arbBootstrapped = false;
  private traderResolved = false;

  get canViewArbitrage(): boolean {
    return this.hasActiveSignalSubscription || this.isSuperAdmin;
  }

  constructor(
    private arbitrageService: ArbitrageService,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.checkTraderStatus();
    this.checkSignalSubscription();

    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.canViewArbitrage) {
          this.secondsToRefresh = AUTO_REFRESH_SECONDS;
          return;
        }

        this.secondsToRefresh -= 1;
        if (this.secondsToRefresh <= 0) {
          this.secondsToRefresh = AUTO_REFRESH_SECONDS;
          this.loadOpportunities(true);
        }
      });

    this.filterForm.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.canViewArbitrage) {
          this.loadOpportunities();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================================
  // SIGNAL SUBSCRIPTION GATE
  // =========================================================================

  private checkTraderStatus(): void {
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.isSuperAdmin = !!res?.data?.isSuperAdmin;
        this.traderResolved = true;
        this.maybeLoadArbitrage();
      },
      error: () => {
        this.isSuperAdmin = false;
        this.traderResolved = true;
        this.maybeLoadArbitrage();
      },
    });
  }

  private checkSignalSubscription(): void {
    this.signalSubscriptionLoading = true;

    this.signalsService.getMySubscriptions().subscribe({
      next: (subs: MySubscription[]) => {
        this.activeSignalSubscription =
          (subs || []).find((s) => getSubscriptionPeriodStatus(s) === SubscriptionPeriodStatus.Active) ?? null;
        this.hasActiveSignalSubscription = !!this.activeSignalSubscription;
        this.signalSubscriptionLoading = false;
        this.maybeLoadArbitrage();
      },
      error: () => {
        this.hasActiveSignalSubscription = false;
        this.activeSignalSubscription = null;
        this.signalSubscriptionLoading = false;
        this.maybeLoadArbitrage();
      },
    });
  }

  /**
   * Loads opportunities exactly once, and only once both the trader's admin
   * status and their signal-subscription status are resolved — so an
   * unentitled visitor never triggers the opportunities request at all.
   */
  private maybeLoadArbitrage(): void {
    if (this.arbBootstrapped) return;
    if (!this.traderResolved || this.signalSubscriptionLoading) return;

    if (this.canViewArbitrage) {
      this.arbBootstrapped = true;
      this.loadOpportunities();
    }
  }

  /**
   * Opens a professional in-context prompt explaining the Signals gate,
   * instead of immediately navigating the trader away from the page. The
   * trader confirms in the dialog before we route them to the plans page.
   */
  openSignalsSubscribePrompt(): void {
    const data: SubscribePromptDialogData = {
      title: 'Unlock the arbitrage scanner',
      description:
        'Live cross-exchange spreads and one-click trade execution are reserved for traders with an active Signals subscription. Subscribe to any plan to start scanning.',
      icon: 'bolt',
      mode: 'navigate',
      navigateLabel: 'View subscription plans',
    };

    const ref = this.dialog.open(SubscribePromptDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'spd-dialog-panel',
      data,
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.navigate) {
        this.router.navigate(['/myaccount/signals']);
      }
    });
  }

  // =========================================================================
  // ARBITRAGE
  // =========================================================================

  get activeConfig(): ExchangeConfig {
    return this.exchangeConfig[this.activeExchange];
  }

  selectExchange(id: string): void {
    if (this.activeExchange === id) return;
    this.activeExchange = id;
    this.currentPage = 1;
  }

  // Filtered + sorted, but NOT yet paginated — used to compute totals.
  get visibleOpportunities(): ArbitrageOpportunity[] {
    return this.allOpportunities
      .filter(
        (o) => o.buyExchange === this.activeExchange || o.sellExchange === this.activeExchange
      )
      .sort((a, b) => b.spreadPercent - a.spreadPercent);
  }

  // What the table actually renders: one page's worth of visibleOpportunities.
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

  // Compact page-number list with ellipses, e.g. [1, '…', 4, 5, 6, '…', 12]
  get pageNumbers(): (number | '…')[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>([1, total, current, current - 1, current + 1]);
    const sorted = Array.from(pages)
      .filter((p) => p >= 1 && p <= total)
      .sort((a, b) => a - b);

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

  activePriceFor(o: ArbitrageOpportunity): number {
    return this.isActiveBuyLeg(o) ? o.buyPrice : o.sellPrice;
  }

  counterpartyPriceFor(o: ArbitrageOpportunity): number {
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
    if (!this.canViewArbitrage) return;

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
          // Filters/refresh can shrink the result set — clamp back onto
          // a valid page instead of showing an empty table on a stale page.
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
    if (!this.canViewArbitrage) return;
    this.secondsToRefresh = AUTO_REFRESH_SECONDS;
    this.loadOpportunities();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadOpportunities();
  }

  openTradeDialog(o: ArbitrageOpportunity): void {
    if (!this.canViewArbitrage) return;

    const ref = this.dialog.open(PlaceTradeDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
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