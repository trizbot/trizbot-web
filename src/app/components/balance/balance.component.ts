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
import {
  ARBITRAGE_SUBSCRIPTION_PLANS,
  MyArbitrageSubscription,
  ArbitrageSubscriptionPlan,
  getArbitrageSubscriptionPeriodStatus,
  ArbitrageSubscriptionPeriodStatus,
} from '../../../app/pages/myaccount/arbitrage/model/arbitrage-subscription.model';

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
  arbitradeStatus: boolean;
  arbitradeState: string;
  arbitradeExpiry: string;
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

  readonly arbSubscriptionPlans = ARBITRAGE_SUBSCRIPTION_PLANS;

  hasActiveArbitrageSubscription = false;

  arbitrageSubscriptionLoading = true;
  activeArbitrageSubscription: MyArbitrageSubscription | null = null;

  countdownToArbExpiry: string = '';
  private arbCountdownSub: Subscription | null = null;

  private traderResolved = false;

  private arbBootstrapped = false;

  get canViewArbitrage(): boolean {
    if (!this.arbitradeStatus) {
      return true;
    }
    return this.arbitradeStatus;
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

    // NOTE: subscription status is no longer fetched separately — it comes
    // back on the trader response inside getCurrentTrader() below.

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
    this.arbitrageSubscriptionLoading = true;

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
        this.arbitradeStatus = res.data.arbitradeStatus ?? false;
        this.arbitradeState = res.data.arbitradeState ?? 'Active';
        this.arbitradeExpiry = res.data.arbitradeExpiry ?? '';

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

        const rawSub = (res.data as any).arbitrageSubscription as MyArbitrageSubscription | null;
        this.activeArbitrageSubscription =
          rawSub && getArbitrageSubscriptionPeriodStatus(rawSub) === ArbitrageSubscriptionPeriodStatus.Active
            ? rawSub
            : null;
        this.hasActiveArbitrageSubscription = !!this.activeArbitrageSubscription;
        this.arbitrageSubscriptionLoading = false;
        this.restartArbCountdown();

        this.traderResolved = true;

        this.maybeLoadOpportunities();
      },
      error: (err) => {
        this.errorMessage = '';
        this.isLoading = false;
        this.traderResolved = true;

        this.hasActiveArbitrageSubscription = false;
        this.activeArbitrageSubscription = null;
        this.arbitrageSubscriptionLoading = false;
        this.countdownToArbExpiry = '';
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

  formatExpiryDays(hoursInput: number | string): string {
    const totalHours = Math.max(0, Number(hoursInput) || 0);
    const days = Math.round(totalHours / 24);
    return `${days}d`;
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
  // Countdown
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

  /**
   * Bootstraps the opportunities fetch exactly once, and only once the
   * trader response has resolved.
   */
  private maybeLoadOpportunities(): void {
    if (this.arbBootstrapped) return;
    if (!this.traderResolved || this.arbitrageSubscriptionLoading) return;
    if (!this.canViewArbitrage) return;

    this.arbBootstrapped = true;
    this.loadOpportunities();
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
    this.allOpportunities = [];
    this.arbBootstrapped = false;
    this.arbCurrentPage = 1;
    this.arbCountdownSub?.unsubscribe();
    this.arbCountdownSub = null;

    this.sharedService.showToast({ title: 'Your arbitrage subscription has expired.' });
    this.getCurrentTrader();
  }

  checkArbitrageSubscriptionRetry(): void {
    this.getCurrentTrader();
  }

  // -----------------------------------------------------------------------
  // Subscribe dialog. The preview/confirm step between picking a plan and
  // actually charging it is handled entirely inside
  // SubscribePromptDialogComponent — this method just supplies the plan
  // list and the Observable that performs the real subscribe call.
  // -----------------------------------------------------------------------
  openArbitrageSubscribeDialog(): void {
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
      icon: 'lock_open',
      mode: 'plans',
      plans,
      onSubscribe: (planKey: string) => this.arbitrageService.subscribe(planKey as ArbitrageSubscriptionPlan),
    };

    const ref = this.dialog.open(SubscribePromptDialogComponent, {
      width: '560px',
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

  activePriceFor(o: ArbitrageOpportunity): number | null {
    return this.isActiveBuyLeg(o) ? o.buyPrice : o.sellPrice;
  }

  counterpartyPriceFor(o: ArbitrageOpportunity): number | null {
    return this.isActiveBuyLeg(o) ? o.sellPrice : o.buyPrice;
  }

  isSpreadLocked(o: { estimatedProfit: any }): boolean {
    if (o.estimatedProfit >= 2) {
      if (this.arbitradeStatus) {
        return !this.canViewArbitrage;
      } else {
        return this.canViewArbitrage;
      }
    } else {
      return o.estimatedProfit <= 1 && !this.canViewArbitrage;
    }
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
    // Hard gate: never fetch (let alone render) opportunities data unless
    // the trader is currently entitled to see it.
    if (!this.canViewArbitrage) return;

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
    if (!this.canViewArbitrage) return;
    this.secondsToRefresh = AUTO_REFRESH_SECONDS;
    this.loadOpportunities();
  }

  applyArbFilters(): void {
    if (!this.canViewArbitrage) return;
    this.arbCurrentPage = 1;
    this.loadOpportunities();
  }

  openTradeDialog(o: ArbitrageOpportunity): void {
    if (!this.canViewArbitrage) {
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
    this.arbCountdownSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}