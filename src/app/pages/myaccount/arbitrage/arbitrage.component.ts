import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { Subject, interval } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { ArbitrageService } from './arbitrage.service';
import { PlaceTradeDialogComponent } from './place-trade-dialog/place-trade-dialog.component';
import {
  ArbitrageOpportunity,
  EXCHANGE_CONFIG,
  EXCHANGE_IDS,
  ExchangeConfig,
  TOKEN_OPTIONS,
} from './model/arbitrage.model';

const AUTO_REFRESH_SECONDS = 20;

@Component({
  selector: 'app-arbitrage',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './arbitrage.component.html',
  styleUrls: ['./arbitrage.component.scss'],
})
export class ArbitrageComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private destroy$ = new Subject<void>();

  readonly exchangeIds = EXCHANGE_IDS;
  readonly exchangeConfig = EXCHANGE_CONFIG;
  readonly tokenOptions = TOKEN_OPTIONS;
  // Exposed so the template no longer hardcodes the refresh interval.
  readonly refreshIntervalSeconds = AUTO_REFRESH_SECONDS;

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

  constructor(private arbitrageService: ArbitrageService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadOpportunities();

    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.secondsToRefresh -= 1;
        if (this.secondsToRefresh <= 0) {
          this.secondsToRefresh = AUTO_REFRESH_SECONDS;
          this.loadOpportunities(true);
        }
      });

    // React to filter changes without requiring a manual (change) handler on every field.
    this.filterForm.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.loadOpportunities());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get activeConfig(): ExchangeConfig {
    return this.exchangeConfig[this.activeExchange];
  }

  selectExchange(id: string): void {
    this.activeExchange = id;
  }

  // Opportunities where the active exchange appears on either leg,
  // best spread first.
  get visibleOpportunities(): ArbitrageOpportunity[] {
    return this.allOpportunities
      .filter(
        (o) => o.buyExchange === this.activeExchange || o.sellExchange === this.activeExchange
      )
      .sort((a, b) => b.spreadPercent - a.spreadPercent);
  }

  // Whether, for the current row, the active exchange is the cheaper (buy) leg.
  isActiveBuyLeg(o: ArbitrageOpportunity): boolean {
    return o.buyExchange === this.activeExchange;
  }

  counterpartyId(o: ArbitrageOpportunity): string {
    return this.isActiveBuyLeg(o) ? o.sellExchange : o.buyExchange;
  }

  // Human-readable label for the counterparty exchange (was previously
  // rendered as the raw exchange id, e.g. "kraken" instead of "Kraken").
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

  refreshNow(): void {
    this.secondsToRefresh = AUTO_REFRESH_SECONDS;
    this.loadOpportunities();
  }

  applyFilters(): void {
    this.loadOpportunities();
  }

  openTradeDialog(o: ArbitrageOpportunity): void {
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