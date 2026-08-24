import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, interval, of } from 'rxjs';
import { catchError, debounceTime, takeUntil, timeout } from 'rxjs/operators';

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

/** Single source of truth for what the arbitrage panel should show. */
type ArbAccessState = 'checking' | 'unlocked' | 'locked';

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


  accessState: ArbAccessState = 'checking';
  isSuperAdmin = false;
  activeArbitrageSubscription: MyArbitrageSubscription | null = null;

  arbitradeStatus: boolean;
  arbitradeState: string;
  arbitradeExpiry: string;

  countdownToArbExpiry = '';
  private arbCountdownSub: Subscription | null = null;

   get canViewArbitrage(): boolean {
    if (!this.arbitradeStatus){
      return this.accessState == 'unlocked';
    }
    return this.accessState == 'unlocked';
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
    // this.checkAccess();
this.getCurrentTrader();

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
        if (this.canViewArbitrage) this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.arbCountdownSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

isSpreadLocked(o: { estimatedProfit: any }): boolean {
  if (o.estimatedProfit >=2){
    if (this.arbitradeStatus){
      return !this.canViewArbitrage;
    }else{
    return this.canViewArbitrage;
    }
    
  }else{
  return o.estimatedProfit <=1 && !this.canViewArbitrage;
}
}

  
    getCurrentTrader() {
      
      this.traderService.getTrader().subscribe({
        next: (res: GetTraderResBody) => {
           
          this.arbitradeStatus = res.data.arbitradeStatus ?? false;
          this.arbitradeState = res.data.arbitradeState ?? 'Active';
          this.arbitradeExpiry = res.data.arbitradeExpiry ?? '';
  
  
      
    
        },
        error: (err) => {
        
          this.countdownToArbExpiry = '';
        },
      });
    }
  

 checkAccess(): void {
  this.traderService
    .getTrader()
    .pipe(timeout(15000), catchError(() => of(null as GetTraderResBody | null)), takeUntil(this.destroy$))
    .subscribe((trader) => {
      this.isSuperAdmin = !!trader?.data?.isSuperAdmin;
      const rawSub = (trader?.data as any)?.arbitrageSubscription as MyArbitrageSubscription | null | undefined;
      this.activeArbitrageSubscription =
        rawSub && getArbitrageSubscriptionPeriodStatus(rawSub) === ArbitrageSubscriptionPeriodStatus.Active
          ? rawSub
          : null;
      this.restartArbCountdown();
      this.loadOpportunities(); // always — server masks per-row now
    });
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
    if (this.accessState !== 'unlocked') return;

    this.activeArbitrageSubscription = null;
    this.allOpportunities = [];
    this.currentPage = 1;
    this.arbCountdownSub?.unsubscribe();
    this.arbCountdownSub = null;

    this.sharedService.showToast({ title: 'Your arbitrage subscription has expired.' });
    this.checkAccess();
  }

  private pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  openArbitrageSubscribePrompt(): void {
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
        'Live cross-exchange spreads and one-click trade execution are reserved for traders with an active arbitrage subscription. Choose a plan below to unlock.',
      icon: 'bolt',
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
        this.checkAccess();
      }
    });
  }

  // =========================================================================
  // ARBITRAGE — opportunities table (unchanged)
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
    if (!this.canViewArbitrage) return;
    this.currentPage = 1;
    this.loadOpportunities();
  }

  openTradeDialog(o: ArbitrageOpportunity): void {
  if (o.locked) {
    this.openArbitrageSubscribePrompt();
    return;
  }
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