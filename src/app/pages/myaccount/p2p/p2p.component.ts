import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';



import { CreateOrderDialogComponent } from './create-order-dialog/create-order-dialog.component';
import { InitiateTradeDialogComponent } from './initiate-trade-dialog/initiate-trade-dialog.component';
import { DisputeResolutionDialogComponent } from './dispute-resolution-dialog/dispute-resolution-dialog.component';
import { Observable, Subscription } from 'rxjs';
import { Trader } from '../../../../app/appstate/appstate-model';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { TraderService } from '../../../../app/appstate/trader.service';
import { P2pCategoryService } from './service/p2p-category.service';
import { P2pService } from './service/p2p.service';
import { ChatUnreadBadgeComponent } from './trade-chat/chat-unread-badge.component'; // adjust path
import { P2pCategoryAdminComponent } from "./p2p-category-admin/p2p-category-admin.component";
import { P2POrderType, OrderStatus, TradeStatus, SUPPORTED_FIAT, QUICK_COINS, P2POrder, getPaymentMethodsForFiat, fiatSymbol, P2PTrade, SUPPORTED_COINS, msUntilDeadline, formatCountdown } from './model/p2p.model';
import { P2pChatService } from './service/p2p-chat.service';


import { P2pPaymentMethodAdminComponent } from './p2p-payment-method-admin/p2p-payment-method-admin.component';
import { P2pPaymentMethodAdminService } from './service/p2p-payment-method-admin.service';


type MainTab = 'market' | 'my-orders' | 'my-trades' | 'disputes' | 'categories' | 'payment-methods';
type MyAdsSubTab = 'listed' | 'all';
type SortOption = 'price-asc' | 'price-desc' | 'available-desc';

const REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '15s Refresh', value: 15 },
  { label: '30s Refresh', value: 30 },
  { label: '60s Refresh', value: 60 },
];

const TRADES_NOTIFICATION_POLL_INTERVAL_MS = 20000;
const TRADES_COUNTDOWN_TICK_MS = 1000;
const COUNTDOWN_URGENT_THRESHOLD_MS = 2 * 60 * 1000;
const DISPUTES_POLL_INTERVAL_MS = 30000;

@Component({
  selector: 'app-p2p',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    MatTabsModule,
    FormsModule,
    ReactiveFormsModule,
    P2pCategoryAdminComponent,
    P2pPaymentMethodAdminComponent,
    ChatUnreadBadgeComponent,
],
  templateUrl: './p2p.component.html',
  styleUrls: ['./p2p.component.scss'],
})
export class P2pComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private categoryService = inject(P2pCategoryService);
  private chatService = inject(P2pChatService);
    private paymentMethodAdminService = inject(P2pPaymentMethodAdminService);


  readonly P2POrderType = P2POrderType;
  readonly OrderStatus = OrderStatus;
  readonly TradeStatus = TradeStatus;
  readonly refreshOptions = REFRESH_OPTIONS;

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

  totalUsers: string;
  totalActiveUsers: number;
  totalWeeklyFunds: number;
  totalWeeklyProfits: number;

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

  currentTraderId = '';

  readonly fiatSuggestions: string[] = SUPPORTED_FIAT;
  readonly quickCoins: string[] = QUICK_COINS;

  activeTab: MainTab = 'market';

  // ---------------------------------------------------------------------
  // Market
  // ---------------------------------------------------------------------
  marketType: P2POrderType = P2POrderType.Buy;

  filterForm = new FormGroup({
    coin: new FormControl<string>('USDT', { nonNullable: true }),
    fiatCurrency: new FormControl<string>('NGN', { nonNullable: true }),
    paymentMethod: new FormControl<string>(''),
    amount: new FormControl<number | null>(null),
    sortBy: new FormControl<SortOption>('price-asc', { nonNullable: true }),
  });

  orders: P2POrder[] = [];
  ordersLoading = false;
  dynamicPaymentMethods: any;

  get paymentMethodOptions(): string[] {
    const fiat = this.filterForm.getRawValue().fiatCurrency;
    return this.dynamicPaymentMethods[(fiat || 'NGN').toUpperCase()] || getPaymentMethodsForFiat(fiat);
  }

  get fiatSymbol(): string {
    return fiatSymbol(this.filterForm.getRawValue().fiatCurrency);
  }

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private refreshDeadline = 0;
  refreshSeconds = 15;
  secondsToRefresh = 15;

  // ---------------------------------------------------------------------
  // My Orders ("My Ads")
  // ---------------------------------------------------------------------
  myOrders: P2POrder[] = [];
  myOrdersLoading = false;
  cancellingOrderId: string | null = null;
  deletingOrderId: string | null = null;
  myAdsSubTab: MyAdsSubTab = 'listed';
  activeModeOn = true;
  togglingListedId: string | null = null;

  // ---------------------------------------------------------------------
  // My Trades + notifications + countdown
  // ---------------------------------------------------------------------
  myTrades: P2PTrade[] = [];
  myTradesLoading = false;

  myTradesUnseenCount = 0;
  private tradesNotificationPollTimer: ReturnType<typeof setInterval> | null = null;

  /** Red dot on the "My Trades" tab — true while any trade has an unread chat message. */
  hasUnreadTradeChats = false;
  private tradeChatUnreadSub: Subscription | null = null;

  private nowTick = Date.now();
  private tradesCountdownTimer: ReturnType<typeof setInterval> | null = null;

  // ---------------------------------------------------------------------
  // Disputes (admin) — escalated trades awaiting manual resolution
  // ---------------------------------------------------------------------
  disputeTrades: P2PTrade[] = [];
  disputesLoading = false;
  private disputesPollTimer: ReturnType<typeof setInterval> | null = null;

  // ---------------------------------------------------------------------
  // Categories (admin)
  // ---------------------------------------------------------------------
  categorySymbols: string[] = [];

  get isAdminUser(): boolean {
    return this.isSuperAdmin;
  }

  get coinSuggestions(): string[] {
    return this.categorySymbols.length ? this.categorySymbols : SUPPORTED_COINS;
  }

  constructor(
    private traderService: TraderService,
    private p2pService: P2pService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.getCurrentTrader();
    this.startAutoRefresh();
    this.startTradesNotificationPolling();
    this.startTradesCountdown();

    this.categoryService.getCategorySymbols().subscribe({
      next: (symbols) => (this.categorySymbols = symbols),
      error: () => {}, // falls back to SUPPORTED_COINS
    });

    this.filterForm.controls.fiatCurrency.valueChanges.subscribe(() => {
      const stillValid = this.paymentMethodOptions.includes(this.filterForm.getRawValue().paymentMethod || '');
      if (!stillValid) this.filterForm.patchValue({ paymentMethod: '' });
      this.loadOrders();
    });


        this.paymentMethodAdminService.methods$.subscribe(() => {
      this.dynamicPaymentMethods = this.paymentMethodAdminService.methodsByFiat();
    });
    this.paymentMethodAdminService.refresh().subscribe({ error: () => {} }); // falls back to static list


    this.loadDisputes();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopTradesNotificationPolling();
    this.stopTradesCountdown();
    this.stopDisputesPolling();
    this.tradeChatUnreadSub?.unsubscribe();
  }

  getCurrentTrader() {
    this.isLoading = true;
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.isLoading = false;
        this.currentTraderId = (res.data as any).id || (res.data as any)._id || '';

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

        if (this.isAdminUser) {
          this.startDisputesPolling();
        }
      },
      error: (err) => {
        this.errorMessage = '';
        this.isLoading = false;
      },
    });
  }

   selectTab(tab: MainTab): void {
    this.activeTab = tab;
    if (tab === 'market' && this.orders.length === 0) this.loadOrders();
    if (tab === 'my-orders') this.loadMyOrders();
    if (tab === 'my-trades') this.loadMyTrades();
    if (tab === 'disputes') this.loadDisputes();
    if (tab === 'payment-methods') this.loadPaymentMethods();
    if (tab === 'categories') this.loadCategories();
    // 'payment-methods' and 'categories' load themselves in their own components
  }
  loadPaymentMethods() {
    throw new Error('Method not implemented.');
  }
  loadCategories() {
    throw new Error('Method not implemented.');
  }

  // ---------------------------------------------------------------------
  // Market
  // ---------------------------------------------------------------------

  setMarketType(type: P2POrderType): void {
    this.marketType = type;
    this.loadOrders();
  }

  selectQuickCoin(coin: string): void {
    this.filterForm.patchValue({ coin });
    this.loadOrders();
  }

  loadOrders(): void {
    this.ordersLoading = true;
    const { coin, fiatCurrency } = this.filterForm.getRawValue();

    const orderTypeToQuery =
      this.marketType === P2POrderType.Buy ? P2POrderType.Sell : P2POrderType.Buy;

    this.p2pService
      .listOrders({
        type: orderTypeToQuery,
        coin: coin ? coin.toUpperCase() : undefined,
        fiatCurrency: fiatCurrency ? fiatCurrency.toUpperCase() : undefined,
      })
      .subscribe({
        next: (res) => {
          this.orders = res;
          this.ordersLoading = false;
          this.secondsToRefresh = this.refreshSeconds;
        },
        error: () => {
          this.orders = [];
          this.ordersLoading = false;
        },
      });
  }

  isOwnOrder(order: P2POrder): boolean {
    return !!this.currentTraderId && order.merchant?.id === this.currentTraderId;
  }

  filteredOrders(): P2POrder[] {
    const { paymentMethod, amount, sortBy } = this.filterForm.getRawValue();
    const filtered = this.orders.filter((o) => {
      if (this.isOwnOrder(o)) return false;
      if (paymentMethod && !o.paymentMethods.includes(paymentMethod)) return false;
      if (amount != null && amount > 0 && (amount < o.minLimit || amount > o.maxLimit)) return false;
      return true;
    });

    switch (sortBy) {
      case 'price-desc':
        return filtered.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
      case 'available-desc':
        return filtered.sort((a, b) => b.availableAmount - a.availableAmount);
      case 'price-asc':
      default:
        return filtered.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    }
  }

  actionLabelFor(order: P2POrder): string {
    return order.type === P2POrderType.Buy ? 'Sell' : 'Buy';
  }

  isFastRelease(order: P2POrder): boolean {
    return order.merchant.completionRate >= 97 && order.merchant.totalTrades >= 100;
  }

  tradeOrder(order: P2POrder): void {
    if (this.isOwnOrder(order)) {
      this.sharedService.showToast({ title: 'You cannot trade on your own ad.' });
      return;
    }

    const ref = this.dialog.open(InitiateTradeDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: { order },
    });

    ref.afterClosed().subscribe((trade: P2PTrade | undefined) => {
      if (trade) {
        this.activeTab = 'my-trades';
        this.loadMyTrades();
        this.openTrade(trade);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Auto-refresh (market)
  // ---------------------------------------------------------------------

  onRefreshIntervalChange(seconds: number): void {
    this.refreshSeconds = seconds;
    this.startAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    if (!this.refreshSeconds) return;
    this.secondsToRefresh = this.refreshSeconds;
    this.refreshDeadline = Date.now() + this.refreshSeconds * 1000;
    this.refreshTimer = setInterval(() => {
      const msLeft = this.refreshDeadline - Date.now();
      this.secondsToRefresh = Math.max(0, Math.ceil(msLeft / 1000));
      if (msLeft <= 0) {
        if (this.activeTab === 'market' && !this.ordersLoading) this.loadOrders();
        this.refreshDeadline = Date.now() + this.refreshSeconds * 1000;
        this.secondsToRefresh = this.refreshSeconds;
      }
    }, 250);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ---------------------------------------------------------------------
  // My Orders / My Ads
  // ---------------------------------------------------------------------

  selectMyAdsSubTab(tab: MyAdsSubTab): void {
    this.myAdsSubTab = tab;
  }

  visibleMyOrders(): P2POrder[] {
    if (this.myAdsSubTab === 'listed') {
      return this.myOrders.filter((o) => o.status === OrderStatus.Active && o.isListed !== false);
    }
    return this.myOrders;
  }

  loadMyOrders(): void {
    this.myOrdersLoading = true;
    this.p2pService.myOrders().subscribe({
      next: (res) => {
        this.myOrders = res;
        this.myOrdersLoading = false;
      },
      error: () => {
        this.myOrdersLoading = false;
      },
    });
  }

  openCreateOrderDialog(defaultType: P2POrderType = P2POrderType.Buy): void {
    const ref = this.dialog.open(CreateOrderDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: {
        defaultType,
        coinSuggestions: this.coinSuggestions,
        fiatSuggestions: this.fiatSuggestions,
      },
    });

    ref.afterClosed().subscribe((created) => {
      if (created) {
        this.loadMyOrders();
        if (this.activeTab === 'market') this.loadOrders();
      }
    });
  }

  editOrder(order: P2POrder): void {
    const ref = this.dialog.open(CreateOrderDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: {
        defaultType: order.type,
        coinSuggestions: this.coinSuggestions,
        fiatSuggestions: this.fiatSuggestions,
        order,
      },
    });

    ref.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadMyOrders();
        if (this.activeTab === 'market') this.loadOrders();
      }
    });
  }

  cancelOrder(order: P2POrder): void {
    this.cancellingOrderId = order.id;
    this.p2pService.cancelOrder(order.id).subscribe({
      next: () => {
        this.cancellingOrderId = null;
        this.sharedService.showToast({ title: 'Ad cancelled.' });
        this.loadMyOrders();
      },
      error: (err) => {
        this.cancellingOrderId = null;
        const message = err?.error?.message || 'Could not cancel this ad.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  deleteOrder(order: P2POrder): void {
    const confirmed = window.confirm('Delete this ad permanently? This cannot be undone.');
    if (!confirmed) return;

    this.deletingOrderId = order.id;

    this.p2pService.deleteOrder(order.id).subscribe({
      next: () => {
        this.myOrders = this.myOrders.filter((o) => o.id !== order.id);
        this.p2pService.myOrders().subscribe({
          next: (res) => {
            this.myOrders = res;
            this.deletingOrderId = null;

            const stillOnServer = res.some((o) => o.id === order.id);
            if (stillOnServer) {
              this.sharedService.showToast({
                title: 'The server did not delete this ad. Please try again or contact support.',
              });
            } else {
              this.sharedService.showToast({ title: 'Ad deleted.' });
            }
          },
          error: () => {
            this.deletingOrderId = null;
            this.sharedService.showToast({ title: 'Ad deleted, but the list failed to refresh.' });
          },
        });
      },
      error: (err) => {
        this.deletingOrderId = null;
        const message = err?.error?.message || 'Could not delete this ad.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  toggleOrderListed(order: P2POrder): void {
    if (order.status !== OrderStatus.Active) return;
    this.togglingListedId = order.id;
    const next = !(order.isListed !== false);
    this.p2pService.setOrderListed(order.id, next).subscribe({
      next: (updated) => {
        this.togglingListedId = null;
        order.isListed = updated.isListed ?? next;
        this.sharedService.showToast({ title: next ? 'Ad is now listed.' : 'Ad is now hidden.' });
      },
      error: (err) => {
        this.togglingListedId = null;
        const message = err?.error?.message || 'Could not update this ad.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  onActiveModeToggle(isOn: boolean): void {
    this.activeModeOn = isOn;
    const targets = this.myOrders.filter((o) => o.status === OrderStatus.Active);
    targets.forEach((order) => {
      order.isListed = isOn;
      this.p2pService.setOrderListed(order.id, isOn).subscribe();
    });
    this.sharedService.showToast({
      title: isOn ? 'Your ads are live again.' : 'Your ads are hidden from the market.',
    });
  }

  copyOrderId(order: P2POrder): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(order.id).catch(() => undefined);
    }
    this.sharedService.showToast({ title: 'Ad ID copied.' });
  }

  orderStatusLabel(order: P2POrder): string {
    if (order.status !== OrderStatus.Active) return order.status;
    return order.isListed !== false ? 'Listed' : 'Hidden';
  }

  // ---------------------------------------------------------------------
  // My Trades + notifications
  // ---------------------------------------------------------------------

  loadMyTrades(): void {
    this.myTradesLoading = true;
    this.p2pService.myTrades().subscribe({
      next: (res) => {
        this.myTrades = res.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.myTradesLoading = false;
        this.markTradesSeen();
        this.watchTradeChatUnread();
      },
      error: () => {
        this.myTradesLoading = false;
      },
    });
  }


  private watchTradeChatUnread(): void {
    this.tradeChatUnreadSub?.unsubscribe();

    const tradeIds = this.myTrades
      .filter((t) => this.isActiveTrade(t) || t.status === TradeStatus.Paid)
      .map((t) => t.id);

    if (tradeIds.length === 0) {
      this.hasUnreadTradeChats = false;
      return;
    }

    this.tradeChatUnreadSub = this.chatService
      .getUnreadCountForTrades(tradeIds)
      .subscribe({
        next: (count) => (this.hasUnreadTradeChats = count > 0),
        error: () => (this.hasUnreadTradeChats = false),
      });
  }

  private markTradesSeen(): void {
    this.p2pService.markTradesSeen().subscribe({
      next: () => {
        this.myTradesUnseenCount = 0;
      },
      error: () => {},
    });
  }

  private startTradesNotificationPolling(): void {
    this.pollTradesNotificationCount();
    this.tradesNotificationPollTimer = setInterval(
      () => this.pollTradesNotificationCount(),
      TRADES_NOTIFICATION_POLL_INTERVAL_MS
    );
  }

  private stopTradesNotificationPolling(): void {
    if (this.tradesNotificationPollTimer) {
      clearInterval(this.tradesNotificationPollTimer);
      this.tradesNotificationPollTimer = null;
    }
  }

  private pollTradesNotificationCount(): void {
    if (this.activeTab === 'my-trades') return;

    this.p2pService.getTradesNotificationCount().subscribe({
      next: (res) => {
        const previous = this.myTradesUnseenCount;
        this.myTradesUnseenCount = res.count;
        if (res.count > previous) {
          this.sharedService.showToast({
            title:
              res.count - previous === 1
                ? 'You have a new trade update.'
                : `You have ${res.count - previous} new trade updates.`,
          });
        }
      },
      error: () => {},
    });
  }

  // ---------------------------------------------------------------------
  // Disputes (admin)
  // ---------------------------------------------------------------------

  // loadDisputes(): void {
  //   if (!this.isAdminUser) return;
  //   this.disputesLoading = true;
  //   this.p2pService.listEscalatedDisputes().subscribe({
  //     next: (res) => {
  //       this.disputeTrades = res;
  //       this.disputesLoading = false;
  //     },
  //     error: () => {
  //       this.disputesLoading = false;
  //     },
  //   });
  // }

  private startDisputesPolling(): void {
    this.stopDisputesPolling();
    this.loadDisputes();
    this.disputesPollTimer = setInterval(() => {
      // Only silently refresh in the background when the tab isn't
      // active — loadDisputes() already handles the active-tab case
      // via selectTab(), and this avoids yanking the list while the
      // admin is mid-review.
      if (this.activeTab !== 'disputes') this.loadDisputes();
    }, DISPUTES_POLL_INTERVAL_MS);
  }

  private stopDisputesPolling(): void {
    if (this.disputesPollTimer) {
      clearInterval(this.disputesPollTimer);
      this.disputesPollTimer = null;
    }
  }

  openDisputeResolution(trade: P2PTrade): void {
    const ref = this.dialog.open(DisputeResolutionDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { trade },
    });

    ref.afterClosed().subscribe((resolved: P2PTrade | undefined) => {
      if (resolved) {
        this.disputeTrades = this.disputeTrades.filter((t) => t.id !== resolved.id);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Payment countdown
  // ---------------------------------------------------------------------

  private startTradesCountdown(): void {
    this.stopTradesCountdown();
    this.tradesCountdownTimer = setInterval(() => {
      this.nowTick = Date.now();
    }, TRADES_COUNTDOWN_TICK_MS);
  }

  private stopTradesCountdown(): void {
    if (this.tradesCountdownTimer) {
      clearInterval(this.tradesCountdownTimer);
      this.tradesCountdownTimer = null;
    }
  }

  tradeFiatSymbol(trade: P2PTrade): string {
    return fiatSymbol(trade.order?.fiatCurrency);
  }

  counterpartyName(trade: P2PTrade): string {
    const merchant = trade.isBuyer ? trade.seller : trade.buyer;
    return merchant?.username || 'Trader';
  }

  yourRoleLabel(trade: P2PTrade): string {
    return trade.isBuyer ? 'You are buying' : 'You are selling';
  }

  openTrade(trade: P2PTrade): void {
    const ref = this.dialog.open(InitiateTradeDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: { trade },
    });

    ref.afterClosed().subscribe(() => this.loadMyTrades());
  }

  trackByOrderId(_index: number, order: P2POrder): string {
    return order.id;
  }

  trackByTradeId(_index: number, trade: P2PTrade): string {
    return trade.id;
  }

  getTradeCountdownLabel(trade: P2PTrade): string {
    if (trade.status !== TradeStatus.Pending || !trade.paymentDeadline) return '';
    const msLeft = msUntilDeadline(trade.paymentDeadline, this.nowTick);
    return formatCountdown(msLeft);
  }

  isTradeCountdownUrgent(trade: P2PTrade): boolean {
    if (trade.status !== TradeStatus.Pending || !trade.paymentDeadline) return false;
    const msLeft = msUntilDeadline(trade.paymentDeadline, this.nowTick);
    return msLeft > 0 && msLeft <= COUNTDOWN_URGENT_THRESHOLD_MS;
  }

  isActiveTrade(trade: P2PTrade): boolean {
    return trade.status === TradeStatus.Pending || trade.status === TradeStatus.Paid;
  }
looksLikeImage(url: string | undefined | null): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp)($|\?)/i.test(url) || url.startsWith('data:image/');
}

loadDisputes(): void {
  if (!this.isAdminUser) return;
  this.disputesLoading = true;
  this.p2pService.listEscalatedDisputes().subscribe({
    next: (res) => {
      this.disputeTrades = res.filter(t => t.status === TradeStatus.Disputed);
      this.disputesLoading = false;
    },
    error: () => {
      this.disputesLoading = false;
    },
  });
}


}