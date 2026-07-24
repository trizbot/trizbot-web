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
import { TradeDetailDialogComponent } from './trade-detail-dialog/trade-detail-dialog.component';

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

  activeTab: MainTab = 'market';

  // ---------------------------------------------------------------------
  // Market
  // ---------------------------------------------------------------------
  marketType: P2POrderType = P2POrderType.Buy;
  filterForm = new FormGroup({
    coin: new FormControl('USDT'),
    fiatCurrency: new FormControl('NGN'),
    paymentMethod: new FormControl<string>(''),
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

  constructor(private p2pService: P2pService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadOrders();
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
        coin: coin || undefined,
        fiatCurrency: fiatCurrency || undefined,
      })
      .subscribe({
        next: (res) => {
          this.orders = this.applyPaymentMethodFilter(res);
          this.ordersLoading = false;
        },
        error: () => {
          this.ordersLoading = false;
        },
      });
  }

  private applyPaymentMethodFilter(orders: P2POrder[]): P2POrder[] {
    const method = this.filterForm.getRawValue().paymentMethod;
    if (!method) return orders;
    return orders.filter((o) => o.paymentMethods.includes(method));
  }

  // The action verb on each row is the OPPOSITE of the ad's type:
  // a BUY ad means the poster buys, so the taker sells to them, and vice versa.
  actionLabelFor(order: P2POrder): string {
    return order.type === P2POrderType.Buy ? 'Sell' : 'Buy';
  }

  tradeOrder(order: P2POrder): void {
    // In a full build this opens a "trade amount" dialog collecting coinAmount /
    // paymentMethod (+ transactionPin when the taker is the seller), then calls
    // p2pService.initiateTrade(...). Wired here to keep the flow explicit.
    this.sharedService.showToast({
      title: `Opening trade for ${order.merchant.username}'s ad — hook this up to your amount-entry dialog.`,
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
      data: { defaultType },
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
    const ref = this.dialog.open(TradeDetailDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: { trade },
    });

    ref.afterClosed().subscribe(() => this.loadMyTrades());
  }

  isActiveTrade(trade: P2PTrade): boolean {
    return trade.status === TradeStatus.PendingPayment || trade.status === TradeStatus.Paid;
  }
}