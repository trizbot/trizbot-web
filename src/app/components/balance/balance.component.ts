import { Component, OnInit, OnDestroy, Inject, inject } from '@angular/core';
import { MaterialModule } from '../../material.module';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TablerIconsModule } from 'angular-tabler-icons';

import { interval, Subscription, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { TraderService } from '../../../app/appstate/trader.service';
import {
  GetTraderResBody,
  GetCryptoResBody,
  GetWeeklyStatisticsResBody,
  SubscriptionStats,
  AdminCourseStats,
} from '../../../app/services/auth.type';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Trader } from '../../../app/appstate/appstate-model';
import { selectTrader, selectTraderLoading, selectTraderError } from '../../../app/appstate/trader.selectors';
import { CryptoService } from '../../../app/pages/myaccount/crypto/crypto.service';
import { Router, RouterModule } from '@angular/router';
import { InvestmentService } from '../../../app/pages/myaccount/invest/investment.service';
import { AuthService } from '../../../app/services/auth.service';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ArbitrageService } from '../../../app/pages/myaccount/arbitrage/arbitrage.service';
import { PlaceTradeDialogComponent } from '../../../app/pages/myaccount/arbitrage/place-trade-dialog/place-trade-dialog.component';
import {
  SubscribePromptDialogComponent,
  SubscribePromptDialogData,
  SubscribePromptPlan,
} from '../../../app/pages/myaccount/arbitrage/subscribe-dialog/subscribe-prompt-dialog.component';
import {
  ArbitrageOpportunity,
  EXCHANGE_CONFIG,
  EXCHANGE_IDS,
  ExchangeConfig,
} from '../../../app/pages/myaccount/arbitrage/model/arbitrage.model';
import { SharedService } from '../../../app/shared/shared.service';
import { ARBITRAGE_SUBSCRIPTION_PLANS, MyArbitrageSubscription, ArbitrageSubscriptionPlan, getArbitrageSubscriptionPeriodStatus, ArbitrageSubscriptionPeriodStatus } from '../../../app/pages/myaccount/arbitrage/model/arbitrage-subscription.model';


const AUTO_REFRESH_SECONDS = 20;
const PAGE_SIZE_OPTIONS = [5, 10, 15, 25, 20, 30, 35, 40, 50] as const;

@Component({
  selector: 'app-sales-overview',
  standalone: true,
  imports: [
    MaterialModule,
    TablerIconsModule,
    CommonModule,
    RouterModule,
    NgApexchartsModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './balance.component.html',
  styleUrl: './balance.component.scss',
})
export class WalletBalanceComponent implements OnInit, OnDestroy {
  // ---------------------------------------------------------------------
  // Wallet / trader state
  // ---------------------------------------------------------------------
  walletBalance: string = '0.00';
  tradeRewardCashWalletBalance: string = '0.00';
  amountInvested: string = '0.00';
  profit: string = '0.00';
  depositBalance: string = '0.00';
  userRevenue: string = '';
  lastName: string = '';
  phoneNumber: string = '';
  walletAddress: string = '';
  userProfit: string = '';
  imageSecureUrl: string = '';
  errorMessage: string = '';
  trader$: Observable<Trader | null>;
  loading$: Observable<boolean>;
  error$: Observable<any>;

  totalUsers: number = 0;
  totalActiveUsers: number = 0;
  totalWeeklyFunds: number = 0;
  totalWeeklyProfits: number = 0;

  // ---------------------------------------------------------------------
  // Admin dashboard: subscription / course stats
  // ---------------------------------------------------------------------
  signalStats: SubscriptionStats = { totalSubscribers: 0, totalAmount: 0, buyPriceCount: 0, sellPriceCount: 0, byPlan: [] };
  arbitrageScannerStats: SubscriptionStats = { totalSubscribers: 0, totalAmount: 0, buyPriceCount: 0, sellPriceCount: 0, byPlan: [] };
  adminCourseStats: AdminCourseStats = { totalSales: 0, totalAmount: 0 };

  entityName: string;
  isSuperAdmin: boolean;
  isKycVerified: boolean;
  isCryptoAvailableStatus: boolean;
  payoutStatus: boolean;
  isCryptoAvailableDescription: string;
  isTradersDashBoardType: boolean;
  isAdminDashBoardType: boolean;
  isNormalEntityType: boolean;
  isSuperEntityType: boolean;
  isLoading = true;

  countdowns: { [key: string]: string } = {};
  private timerSub: Subscription;

  // ---------------------------------------------------------------------
  // Arbitrage state (merged from ArbitrageComponent)
  // ---------------------------------------------------------------------
  private destroy$ = new Subject<void>();

  readonly exchangeIds = EXCHANGE_IDS;
  readonly exchangeConfig = EXCHANGE_CONFIG;
  readonly refreshIntervalSeconds = AUTO_REFRESH_SECONDS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  arbTokenOptions: string[] = [];
  private knownArbTokens = new Set<string>();

  activeExchange: string = EXCHANGE_IDS[0];

  arbFilterForm = new FormGroup({
    token: new FormControl<string>(''),
    minSpreadPercent: new FormControl<number | null>(null),
  });

  allOpportunities: ArbitrageOpportunity[] = [];
  arbLoading = false;
  arbError: string | null = null;
  arbLastUpdated: Date | null = null;
  secondsToRefresh = AUTO_REFRESH_SECONDS;

  arbCurrentPage = 1;
  arbPageSize: number = PAGE_SIZE_OPTIONS[1]; // default 25

  // ---------------------------------------------------------------------
  // Arbitrage pricing gate — its OWN subscription, separate from Signals.
  // Opportunities with spreadPercent < FREE_SPREAD_THRESHOLD are free to
  // everyone. Everything at/above the threshold requires an active
  // Arbitrage subscription (or super-admin bypass).
  // ---------------------------------------------------------------------
  readonly FREE_SPREAD_THRESHOLD = 1; // %
  readonly arbSubscriptionPlans = ARBITRAGE_SUBSCRIPTION_PLANS;

  hasActiveArbitrageSubscription = false;
  arbitrageSubscriptionLoading = true;
  activeArbitrageSubscription: MyArbitrageSubscription | null = null;

  private traderResolved = false;

  /** Whether the trader can see opportunities at/above the free threshold. */
  get canViewPremiumArbitrage(): boolean {
    return this.hasActiveArbitrageSubscription || !!this.isSuperAdmin;
  }

  /** Individual row-level gate used by the template. */
  isOpportunityLocked(o: ArbitrageOpportunity): boolean {
    return o.spreadPercent >= this.FREE_SPREAD_THRESHOLD && !this.canViewPremiumArbitrage;
  }

  get arbSubscriptionPlanList(): { key: ArbitrageSubscriptionPlan; label: string; price: number; durationDays: number }[] {
    return (Object.keys(this.arbSubscriptionPlans) as ArbitrageSubscriptionPlan[]).map((key) => ({
      key,
      ...this.arbSubscriptionPlans[key],
    }));
  }

  constructor(
    private store: Store,
    private traderService: TraderService,
    private authService: AuthService,
    private cryptoService: CryptoService,
    private investService: InvestmentService,
    private router: Router,
    private arbitrageService: ArbitrageService,
    private dialog: MatDialog,
    private sharedService: SharedService,
  ) {
    this.trader$ = this.store.select(selectTrader);
    this.loading$ = this.store.select(selectTraderLoading);
    this.error$ = this.store.select(selectTraderError);
  }

  ngOnInit(): void {
    this.getCurrentTrader();
    this.getAvailableCryptos();
    this.updatePagedList();
    this.updateInvestPagedList();
    this.updateCompletedInvestPagedList();
    this.getInvestments();
    this.getCompletedInvestments();
    this.getWeeklyStatistics();
    this.startCountdown();

    // Arbitrage: fetch opportunities immediately — the free tier (<1%
    // spread) is public, so we don't wait on any subscription check.
    this.loadOpportunities();

    // Resolve premium access in parallel; only affects which rows render
    // unlocked, not whether data loads.
    this.checkArbitrageSubscription();

    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.secondsToRefresh -= 1;
        if (this.secondsToRefresh <= 0) {
          this.secondsToRefresh = AUTO_REFRESH_SECONDS;
          this.loadOpportunities(true);
        }
      });

    this.arbFilterForm.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyArbFilters();
      });
  }

  getWeeklyStatistics() {
    this.traderService.getAllTraders({ page: 1, limit: 100001 }).subscribe({
      next: (res: any) => {
        this.totalWeeklyProfits = 0;
        this.totalWeeklyFunds = 0;
        this.totalActiveUsers = 0;

        res.data.forEach((trader: any) => {
          const profit = trader.profit || 0;
          const depositBalance = trader.depositBalance || 0;
          const walletBalance = trader.walletBalance || 0;

          if (profit < 0) {
            this.totalWeeklyProfits += 0;
          } else {
            this.totalWeeklyProfits += profit;
          }
          if (depositBalance < 0) {
            this.totalWeeklyFunds += 0;
          } else {
            this.totalWeeklyFunds += depositBalance;
          }

          if (walletBalance >= 1) {
            this.totalActiveUsers += 1;
          }
        });
      },
      error: () => {},
    });

    this.traderService.getWeeklyStatistics().subscribe({
      next: (res: GetWeeklyStatisticsResBody) => {
        this.totalUsers = res.data.totalUsers;

        this.signalStats = res.data.signal;
        this.arbitrageScannerStats = res.data.arbitrageScanner;
        this.adminCourseStats = res.data.adminCourse;
      },
      error: () => {},
    });
  }

  getCurrentTrader() {
    this.isLoading = true;
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.isLoading = false;
        this.phoneNumber = res.data.phoneNumber;
        this.walletBalance = res.data.walletBalance;
        this.amountInvested = res.data.amountInvested;
        this.walletAddress = res.data.walletAddress;
        this.depositBalance = res.data.depositBalance;
        this.isCryptoAvailableStatus = res.data.isCryptoAvailableStatus;
        this.isCryptoAvailableDescription = res.data.isCryptoAvailableDescription;
        this.payoutStatus = res.data.payoutStatus;
        if (res.data.tradeRewardCashWalletBalance >= 1) {
          this.tradeRewardCashWalletBalance = res.data.tradeRewardCashWalletBalance;
        }
        if (res.data.tradeRewardCashWalletBalance <= 0) {
          this.tradeRewardCashWalletBalance = '0.0';
        }

        this.profit = res.data.profit;
        this.userRevenue = res.data.firstName;
        this.lastName = res.data.lastName;
        this.imageSecureUrl = res.data.imageSecureUrl;
        this.entityName = res.data.entityName;
        this.isSuperAdmin = res.data.isSuperAdmin;
        this.isKycVerified = res.data.isKycVerified ?? false;

        if (this.entityName == 'Admin' && this.isSuperAdmin) {
          this.isSuperEntityType = true;
          this.isAdminDashBoardType = true;
          this.isTradersDashBoardType = false;
        } else if (this.entityName == 'Admin' && !this.isSuperAdmin) {
          this.isSuperEntityType = false;
          this.isAdminDashBoardType = true;
          this.isTradersDashBoardType = false;
        } else if (this.entityName == 'Trader' && this.isSuperAdmin) {
          this.isNormalEntityType = false;
          this.isAdminDashBoardType = true;
          this.isTradersDashBoardType = false;
        } else if (this.entityName == 'Trader' && !this.isSuperAdmin) {
          this.isNormalEntityType = false;
          this.isAdminDashBoardType = false;
          this.isTradersDashBoardType = true;
        } else {
          this.isNormalEntityType = false;
          this.isAdminDashBoardType = false;
          this.isTradersDashBoardType = true;
        }

        this.traderResolved = true;
      },
      error: (err) => {
        this.errorMessage = '';
        this.isLoading = false;
        this.traderResolved = true;
      },
    });
  }

  // -----------------------------------------------------------------------
  // Available cryptos
  // -----------------------------------------------------------------------
  availableCryptoList: any[] = [];
  pagedCryptoList: any[] = [];
  currentPage = 1;
  pageSize = 1000;
  selectedCryptoId: string = '';

  getAvailableCryptos() {
    this.cryptoService.getAvailableCryptos().subscribe({
      next: (res: any[]) => {
        this.availableCryptoList = res
          .filter((item) => item.operationStatus === true)
          .map((item) => ({
            title: item.title,
            minAmount: item.minAmount,
            profit: item.profit,
            id: item._id,
            category: item.category,
            operationStatus: item.operationStatus,
            imageUrl: item.imageSecureUrl,
            expiry: item.expiry,
            percentage: item.percentage,
            buyExchange: item.buyExchange,
            sellExchange: item.sellExchange,
            tradeStatus: item.tradeStatus,
            status: item.status,
            description: item.description,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }))
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        this.updatePagedList();
      },
      error: (err) => {},
    });
  }

  updatePagedList() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedCryptoList = this.availableCryptoList.slice(startIndex, endIndex);
  }

  changePage(page: any) {
    if (page < 1 || page > this.totalPages.length) return;
    this.currentPage = page;
    this.updatePagedList();
  }

  get totalPages(): any[] {
    return Array(Math.ceil(this.availableCryptoList.length / this.pageSize))
      .fill(0)
      .map((_, i) => i + 1);
  }

  onSetupTrade(id: string) {
    this.selectedCryptoId = id;
    const encodedId = btoa(id);
    this.router.navigate(['/myaccount/invest', encodedId]);
  }

  /**
   * Formats a stake's expiry (stored in hours) into a readable duration —
   * shows days once the value crosses 24h instead of always tacking "h"
   * onto a large raw number (e.g. 720h -> "30d", 36h -> "1d 12h").
   */
  formatExpiryHours(hoursInput: number | string): string {
    const totalHours = Math.max(0, Number(hoursInput) || 0);
    if (totalHours < 24) {
      return `${totalHours}h`;
    }
    const days = Math.floor(totalHours / 24);
    const remainingHours = Math.round(totalHours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  // -----------------------------------------------------------------------
  // Running trades
  // -----------------------------------------------------------------------
  investmentList: any[] = [];
  pagedInvestmentList: any[] = [];
  currentInvestPage = 1;
  pageInvestSize = 30;
  selectedInvestId: string = '';
  runningOperation: boolean = false;

  getInvestments() {
    this.investService.getInvestments().subscribe({
      next: (res: any) => {
        this.investmentList = res.data
          .map((item: any) => {
            const investmentItem = {
              amount: item.amount,
              traderEmail: item.traderEmail,
              curBalance: item.curBalance,
              prevBalance: item.prevBalance,
              transactionType: item.transactionType,
              investmentStatus: item.investmentStatus,
              transactionStatus: item.transactionStatus,
              imageUrl: item.imageUrl,
              cryptoId: item.cryptoId,
              cryptoName: item.cryptoName,
              description: item.description,
              traderId: item.traderId,
              traderName: item.traderName,
              profit: item.profit,
              expiry: item.expiry,
              operationStatus: item.operationStatus,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };

            if (item.operationStatus === true && item.transactionType == 'Debit' && item.transactionStatus == 'Pending') {
              this.runningOperation = true;
            } else {
              this.runningOperation = false;
            }

            return investmentItem;
          })
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        this.updateInvestPagedList();
      },
      error: (err) => {},
    });
  }

  updateInvestPagedList() {
    const startIndex = (this.currentInvestPage - 1) * this.pageInvestSize;
    const endIndex = startIndex + this.pageInvestSize;
    this.pagedInvestmentList = this.investmentList.slice(startIndex, endIndex);
  }

  changeInvestPage(page: any) {
    if (page < 1 || page > this.totalInvestPages.length) return;
    this.currentInvestPage = page;
    this.updateInvestPagedList();
  }

  get totalInvestPages(): any[] {
    return Array(Math.ceil(this.investmentList.length / this.pageInvestSize))
      .fill(0)
      .map((_, i) => i + 1);
  }

  // -----------------------------------------------------------------------
  // Completed investments
  // -----------------------------------------------------------------------
  completedInvestmentList: any[] = [];
  pagedCompletedInvestmentList: any[] = [];
  currentCompletedInvestPage = 1;
  pageCompletedInvestSize = 6;
  selectedCompletedInvestId: string = '';

  getCompletedInvestments() {
    this.investService.getCompletedInvestments().subscribe({
      next: (res: any) => {
        this.completedInvestmentList = res.data
          .map((item: any) => {
            const completedInvestmentItem = {
              amount: item.amount,
              traderEmail: item.traderEmail,
              curBalance: item.curBalance,
              prevBalance: item.prevBalance,
              transactionType: item.transactionType,
              transactionStatus: item.investmentStatus,
              imageUrl: item.imageUrl,
              cryptoId: item.cryptoId,
              cryptoName: item.cryptoName,
              description: item.description,
              traderId: item.traderId,
              traderName: item.traderName,
              profit: item.profit,
              expiry: item.expiry,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
            };

            return completedInvestmentItem;
          })
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        this.updateCompletedInvestPagedList();
      },
      error: (err) => {},
    });
  }

  updateCompletedInvestPagedList() {
    const startIndex = (this.currentCompletedInvestPage - 1) * this.pageCompletedInvestSize;
    const endIndex = startIndex + this.pageCompletedInvestSize;
    this.pagedCompletedInvestmentList = this.completedInvestmentList.slice(startIndex, endIndex);
  }

  changeCompletedInvestPage(page: any) {
    if (page < 1 || page > this.totalCompletedInvestPages.length) return;
    this.currentCompletedInvestPage = page;
    this.updateCompletedInvestPagedList();
  }

  get totalCompletedInvestPages(): any[] {
    return Array(Math.ceil(this.completedInvestmentList.length / this.pageCompletedInvestSize))
      .fill(0)
      .map((_, i) => i + 1);
  }

  // -----------------------------------------------------------------------
  // Countdown (accurate days/hours/minutes/seconds — unchanged logic, was
  // already correct; the "hours only" bug lived in the Available-tab
  // expiry label above, not here).
  // -----------------------------------------------------------------------
  startCountdown() {
    this.timerSub = interval(1000).subscribe(() => {
      const now = new Date().getTime();

      this.pagedInvestmentList.forEach((invest) => {
        const expiryTime = new Date(invest.expiry).getTime();
        const remaining = expiryTime - now;

        if (remaining > 0) {
          const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
          const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((remaining / (1000 * 60)) % 60);
          const seconds = Math.floor((remaining / 1000) % 60);
          this.countdowns[invest.expiry] = `${days}d ${this.pad(hours)}h ${this.pad(minutes)}m ${this.pad(seconds)}s`;
        } else {
          if (invest.transactionStatus !== 'Expired') {
            invest.transactionStatus = invest.investmentStatus;

            this.investService.autoRevertFunds().subscribe({
              next: (res: any) => {
                this.countdowns[invest.expiry] = '0d 00h 00m 00s';
              },
            });
          }
        }
      });
    });
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  // =========================================================================
  // ARBITRAGE SUBSCRIPTION (its own gate — separate from Signals)
  // =========================================================================

  private checkArbitrageSubscription(): void {
    this.arbitrageSubscriptionLoading = true;

    this.arbitrageService.getMySubscriptions().subscribe({
      next: (subs: MyArbitrageSubscription[]) => {
        this.activeArbitrageSubscription =
          (subs || []).find((s) => getArbitrageSubscriptionPeriodStatus(s) === ArbitrageSubscriptionPeriodStatus.Active) ?? null;
        this.hasActiveArbitrageSubscription = !!this.activeArbitrageSubscription;
        this.arbitrageSubscriptionLoading = false;
      },
      error: () => {
        this.hasActiveArbitrageSubscription = false;
        this.activeArbitrageSubscription = null;
        this.arbitrageSubscriptionLoading = false;
      },
    });
  }

  /**
   * Opens a professional subscription dialog listing every arbitrage plan.
   * Replaces the old "scroll down to the banner" behaviour — the trader
   * can now pick a plan, see a loading state on the button they clicked,
   * and get a real error message inline if the subscribe call fails,
   * all without leaving the dashboard.
   */
  openArbitrageSubscribeDialog(): void {
    const plansList = this.arbSubscriptionPlanList;
    if (plansList.length === 0) return;

    // Flag whichever plan has the lowest price-per-day as "best value"
    // instead of hard-coding a specific plan key.
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
      title: 'Unlock full arbitrage access',
      description: `Spreads at or above ${this.FREE_SPREAD_THRESHOLD}% are reserved for subscribers. Choose a plan below to unlock live pricing, profit estimates, and one-click trading on every opportunity.`,
      icon: 'lock_open',
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
        this.checkArbitrageSubscription();
      }
    });
  }

  // =========================================================================
  // ARBITRAGE (merged from ArbitrageComponent)
  // =========================================================================

  get activeConfig(): ExchangeConfig {
    return this.exchangeConfig[this.activeExchange];
  }

  selectExchange(id: string): void {
    if (this.activeExchange === id) return;
    this.activeExchange = id;
    this.arbCurrentPage = 1;
  }

  get visibleOpportunities(): ArbitrageOpportunity[] {
    return this.allOpportunities
      .filter((o) => o.buyExchange === this.activeExchange || o.sellExchange === this.activeExchange)
      .sort((a, b) => b.spreadPercent - a.spreadPercent);
  }

  get pagedOpportunities(): ArbitrageOpportunity[] {
    const start = (this.arbCurrentPage - 1) * this.arbPageSize;
    return this.visibleOpportunities.slice(start, start + this.arbPageSize);
  }

  get arbTotalPages(): number {
    return Math.max(1, Math.ceil(this.visibleOpportunities.length / this.arbPageSize));
  }

  get arbPageRangeStart(): number {
    if (this.visibleOpportunities.length === 0) return 0;
    return (this.arbCurrentPage - 1) * this.arbPageSize + 1;
  }

  get arbPageRangeEnd(): number {
    return Math.min(this.arbCurrentPage * this.arbPageSize, this.visibleOpportunities.length);
  }

  get arbPageNumbers(): (number | '…')[] {
    const total = this.arbTotalPages;
    const current = this.arbCurrentPage;
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

  goToArbPage(page: number): void {
    if (page < 1 || page > this.arbTotalPages || page === this.arbCurrentPage) return;
    this.arbCurrentPage = page;
  }

  nextArbPage(): void {
    this.goToArbPage(this.arbCurrentPage + 1);
  }

  prevArbPage(): void {
    this.goToArbPage(this.arbCurrentPage - 1);
  }

  changeArbPageSize(size: number): void {
    if (size === this.arbPageSize) return;
    this.arbPageSize = size;
    this.arbCurrentPage = 1;
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
    if (!silent) this.arbLoading = true;
    this.arbError = null;
    const { token, minSpreadPercent } = this.arbFilterForm.getRawValue();

    this.arbitrageService
      .getOpportunities({
        token: token || undefined,
        minSpreadPercent: minSpreadPercent ?? undefined,
        limit: 100,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.allOpportunities = res;
          this.updateArbTokenOptions(res);
          if (this.arbCurrentPage > this.arbTotalPages) {
            this.arbCurrentPage = this.arbTotalPages;
          }
          this.arbLoading = false;
          this.arbError = null;
          this.arbLastUpdated = new Date();
        },
        error: () => {
          this.arbLoading = false;
          this.arbError = 'Could not load arbitrage opportunities. Please try again.';
        },
      });
  }

  private updateArbTokenOptions(opportunities: ArbitrageOpportunity[]): void {
    let changed = false;
    for (const o of opportunities) {
      if (!this.knownArbTokens.has(o.token)) {
        this.knownArbTokens.add(o.token);
        changed = true;
      }
    }
    if (changed) {
      this.arbTokenOptions = Array.from(this.knownArbTokens).sort();
    }
  }

  refreshArbNow(): void {
    this.secondsToRefresh = AUTO_REFRESH_SECONDS;
    this.loadOpportunities();
  }

  applyArbFilters(): void {
    this.arbCurrentPage = 1;
    this.loadOpportunities();
  }

  openTradeDialog(o: ArbitrageOpportunity): void {
    if (this.isOpportunityLocked(o)) {
      this.openArbitrageSubscribeDialog();
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

  ngOnDestroy() {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}