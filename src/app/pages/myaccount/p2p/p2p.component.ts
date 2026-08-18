import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { P2pService } from './p2p.service';
import {
  OrderStatus,
  P2POrder,
  P2POrderType,
  P2PTrade,
  QUICK_COINS,
  SUPPORTED_COINS,
  SUPPORTED_FIAT,
  TradeStatus,
  fiatSymbol,
  getPaymentMethodsForFiat,
} from './p2p.model';
import { CreateOrderDialogComponent } from './create-order-dialog/create-order-dialog.component';
import { InitiateTradeDialogComponent } from './initiate-trade-dialog/initiate-trade-dialog.component';
import { Observable } from 'rxjs';
import { Trader } from '../../../../app/appstate/appstate-model';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { TraderService } from '../../../../app/appstate/trader.service';

type MainTab = 'market' | 'my-orders' | 'my-trades';
type MyAdsSubTab = 'listed' | 'all';
type SortOption = 'price-asc' | 'price-desc' | 'available-desc';

const REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '15s Refresh', value: 15 },
  { label: '30s Refresh', value: 30 },
  { label: '60s Refresh', value: 60 },
];

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
  ],
  templateUrl: './p2p.component.html',
  styleUrls: ['./p2p.component.scss'],
})
export class P2pComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);

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

  readonly coinSuggestions: string[] = SUPPORTED_COINS;
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

  get paymentMethodOptions(): string[] {
    return getPaymentMethodsForFiat(this.filterForm.getRawValue().fiatCurrency);
  }

  get fiatSymbol(): string {
    return fiatSymbol(this.filterForm.getRawValue().fiatCurrency);
  }

  // Uses a wall-clock deadline rather than a naive per-tick decrement, so the
  // countdown can't drift (or silently stall) if the tab is backgrounded/throttled.
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
  myAdsSubTab: MyAdsSubTab = 'listed';
  activeModeOn = true;
  togglingListedId: string | null = null;

  // ---------------------------------------------------------------------
  // My Trades
  // ---------------------------------------------------------------------
  myTrades: P2PTrade[] = [];
  myTradesLoading = false;

  constructor(
    private traderService: TraderService,
    private p2pService: P2pService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.getCurrentTrader();
    this.startAutoRefresh();

    this.filterForm.controls.fiatCurrency.valueChanges.subscribe(() => {
      const stillValid = this.paymentMethodOptions.includes(this.filterForm.getRawValue().paymentMethod || '');
      if (!stillValid) this.filterForm.patchValue({ paymentMethod: '' });
      this.loadOrders();
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
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

    // Bybit-style flip: the "Buy" tab is where a user comes to BUY crypto, so it
    // must list the SELL ads merchants posted (someone has to sell to you) — and
    // the "Sell" tab must list BUY ads. Querying by marketType directly showed
    // a merchant's own ad type back under the matching tab, which is backwards.
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

  filteredOrders(): P2POrder[] {
    const { paymentMethod, amount, sortBy } = this.filterForm.getRawValue();
    const filtered = this.orders.filter((o) => {
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

  // The action verb is the opposite of the AD's own type: a BUY ad means the
  // poster buys, so the taker sells to them, and vice versa. This still holds
  // correctly now that the Buy/Sell tabs list the opposite ad type.
  actionLabelFor(order: P2POrder): string {
    return order.type === P2POrderType.Buy ? 'Sell' : 'Buy';
  }

  isFastRelease(order: P2POrder): boolean {
    return order.merchant.completionRate >= 97 && order.merchant.totalTrades >= 100;
  }

  tradeOrder(order: P2POrder): void {
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
  // Auto-refresh (mirrors Bybit's "15s / 30s / 60s Refresh" control)
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
    // Tick at 250ms and derive the displayed seconds from a wall-clock deadline
    // instead of decrementing a counter — avoids drift/stalling on slow tabs.
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
  // My Trades
  // ---------------------------------------------------------------------

  loadMyTrades(): void {
    this.myTradesLoading = true;
    this.p2pService.myTrades().subscribe({
      next: (res) => {
        this.myTrades = res.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.myTradesLoading = false;
      },
      error: () => {
        this.myTradesLoading = false;
      },
    });
  }

  openTrade(trade: P2PTrade): void {
    const ref = this.dialog.open(InitiateTradeDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: { trade },
    });

    ref.afterClosed().subscribe(() => this.loadMyTrades());
  }

  isActiveTrade(trade: P2PTrade): boolean {
    return trade.status === TradeStatus.PendingPayment || trade.status === TradeStatus.Paid;
  }

  trackByOrderId(_index: number, order: P2POrder): string {
    return order.id;
  }

  trackByTradeId(_index: number, trade: P2PTrade): string {
    return trade.id;
  }
}