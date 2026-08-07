import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
  PAYMENT_METHODS,
  TradeStatus,
} from './p2p.model';
import { CreateOrderDialogComponent } from './create-order-dialog/create-order-dialog.component';
import { InitiateTradeDialogComponent } from './initiate-trade-dialog/initiate-trade-dialog.component';
import { Observable } from 'rxjs';
import { Trader } from '../../../../app/appstate/appstate-model';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { TraderService } from '../../../../app/appstate/trader.service';

type MainTab = 'market' | 'my-orders' | 'my-trades';

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
export class P2pComponent implements OnInit {
  private sharedService = inject(SharedService);

  readonly P2POrderType = P2POrderType;
  readonly OrderStatus = OrderStatus;
  readonly TradeStatus = TradeStatus;
  readonly paymentMethodOptions = PAYMENT_METHODS;

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

  // Dropdown source lists for the Coin / Currency filters (mat-select).
  readonly coinSuggestions: string[] = [
    'USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'TON', 'TRX', 'DOGE',
    'ADA', 'MATIC', 'LTC', 'DOT', 'SHIB', 'AVAX', 'LINK', 'ATOM', 'BCH', 'ETC',
  ];

  readonly fiatSuggestions: string[] = [
    'NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR', 'INR', 'CNY', 'AED',
    'CAD', 'AUD', 'JPY', 'BRL', 'TRY', 'PKR', 'EGP', 'UGX', 'TZS', 'XOF',
  ];

  activeTab: MainTab = 'market';

  // ---------------------------------------------------------------------
  // Market
  // ---------------------------------------------------------------------
  marketType: P2POrderType = P2POrderType.Buy;

  // Default coin/currency the market opens on. Both are now plain
  // dropdown selections (mat-select) rather than free-text + autocomplete.
  filterForm = new FormGroup({
    coin: new FormControl<string>('USDT'),
    fiatCurrency: new FormControl<string>('NGN'),
    paymentMethod: new FormControl<string>(''),
    amount: new FormControl<number | null>(null),
  });

  orders: P2POrder[] = [];
  ordersLoading = false;

  // ---------------------------------------------------------------------
  // My Orders
  // ---------------------------------------------------------------------
  myOrders: P2POrder[] = [];
  myOrdersLoading = false;
  cancellingOrderId: string | null = null;

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

  loadOrders(): void {
    this.ordersLoading = true;
    const { coin, fiatCurrency } = this.filterForm.getRawValue();
    this.p2pService
      .listOrders({
        type: this.marketType,
        coin: coin ? coin.toUpperCase() : undefined,
        fiatCurrency: fiatCurrency ? fiatCurrency.toUpperCase() : undefined,
      })
      .subscribe({
        next: (res) => {
          this.orders = res;
          this.ordersLoading = false;
        },
        error: () => {
          this.orders = [];
          this.ordersLoading = false;
        },
      });
  }

  /** Client-side refinement on top of the server results: payment method + amount. */
  filteredOrders(): P2POrder[] {
    const { paymentMethod, amount } = this.filterForm.getRawValue();
    return this.orders.filter((o) => {
      if (paymentMethod && !o.paymentMethods.includes(paymentMethod)) return false;
      if (amount != null && amount > 0 && (amount < o.minLimit || amount > o.maxLimit)) return false;
      return true;
    });
  }

  // The action verb on each row is the OPPOSITE of the ad's type:
  // a BUY ad means the poster buys, so the taker sells to them, and vice versa.
  actionLabelFor(order: P2POrder): string {
    return order.type === P2POrderType.Buy ? 'Sell' : 'Buy';
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
  // My Orders
  // ---------------------------------------------------------------------

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