import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';

import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';

import {
  SignalCategoryEnum,
  SIGNAL_CATEGORY_LABELS,
  SIGNAL_TYPE_COLORS,
  SIGNAL_TYPE_LABELS,
  SignalItem,
  SignalListResponse,
} from './model/signal.model';
import { SignalFormDialogComponent } from '../signals/signal-form-dialog/signal-form-dialog.component';
import { ViewSignalsService } from './view-signals.service';

@Component({
  selector: 'app-signals-admin',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './view-signals.component.html',
  styleUrls: ['./view-signals.component.scss'],
})
export class ViewSignalsComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private destroy$ = new Subject<void>();

  private reloadSignals$ = new Subject<void>();

  readonly typeLabels = SIGNAL_TYPE_LABELS;
  readonly typeColors = SIGNAL_TYPE_COLORS;
  readonly categoryLabels = SIGNAL_CATEGORY_LABELS;

  readonly categoryColors: Record<SignalCategoryEnum, string> = {
    [SignalCategoryEnum.Futures]: '#7b61ff',
    [SignalCategoryEnum.Spot]: '#2e7d32',
  };

  filterForm = new FormGroup({
    pair: new FormControl<string>(''),
  });

  signals: SignalItem[] = [];
  signalsLoading = false;
  deletingId: string | null = null;

  page = 1;
  limit = 12;
  total = 0;
  totalPages = 1;

  constructor(private signalsService: ViewSignalsService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.reloadSignals$
      .pipe(
        switchMap(() => {
          this.signalsLoading = true;
          const { pair } = this.filterForm.getRawValue();

          const params = {
            pair: pair || undefined,
            page: this.page,
            limit: this.limit,
          };

          return this.signalsService
            .getSignals(params)
            .pipe(catchError(() => of(null as SignalListResponse | null)));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        console.log(res);
       this.signalsLoading = true;
        if (!res) return;
        this.signals = res.items;
        this.total = res.total;
        this.totalPages = res.totalPages;
      });

    this.loadSignals();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadSignals();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSignals(): void {
    this.reloadSignals$.next();
  }

  clearFilters(): void {
    this.filterForm.reset({ pair: '' });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadSignals();
  }

  pageRange(): number[] {
    const range: number[] = [];
    const spread = 2;
    const start = Math.max(1, this.page - spread);
    const end = Math.min(this.totalPages, this.page + spread);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  riskReward(item: SignalItem): string | null {
    if (item.targetPrice == null || item.stopLoss == null) return null;
    const reward = Math.abs(item.targetPrice - item.entryPrice);
    const risk = Math.abs(item.entryPrice - item.stopLoss);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  }

  timeAgo(date: string | Date): string {
    const then = new Date(date).getTime();
    const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

    const units: [number, string][] = [
      [60, 'second'],
      [60, 'minute'],
      [24, 'hour'],
      [7, 'day'],
      [4.345, 'week'],
      [12, 'month'],
      [Number.POSITIVE_INFINITY, 'year'],
    ];

    let value = seconds;
    let unitLabel = 'second';

    for (const [amount, name] of units) {
      if (value < amount) {
        unitLabel = name;
        break;
      }
      value = Math.floor(value / amount);
      unitLabel = name;
    }

    if (unitLabel === 'second' && value < 10) return 'just now';
    return `${value} ${unitLabel}${value === 1 ? '' : 's'} ago`;
  }

  takeProfitSummary(item: SignalItem): string {
    const levels: string[] = [];
    if (item.takeProfit1 != null) levels.push(`TP1: ${item.takeProfit1}`);
    if (item.takeProfit2 != null) levels.push(`TP2: ${item.takeProfit2}`);
    if (item.takeProfit3 != null) levels.push(`TP3: ${item.takeProfit3}`);
    return levels.length ? levels.join(' / ') : '—';
  }

  trackById(_: number, item: SignalItem): string {
    return item.id;
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(SignalFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { mode: 'create' },
    });

    ref.afterClosed().subscribe((created: SignalItem | null | undefined) => {
      if (!created) return;
      this.sharedService.showToast({ title: 'Signal created successfully.' });
      this.page = 1;
      this.loadSignals();
    });
  }

  openEditDialog(item: SignalItem): void {
    const ref = this.dialog.open(SignalFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { mode: 'edit', item },
    });

    ref.afterClosed().subscribe((updated: SignalItem | null | undefined) => {
      if (!updated) return;
      this.sharedService.showToast({ title: 'Signal updated successfully.' });
      this.loadSignals();
    });
  }

  deleteSignal(item: SignalItem): void {
    if (!confirm(`Delete "${item.pair}" signal? This cannot be undone.`)) return;

    this.deletingId = item.id;
    this.signalsService
      .deleteSignal(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.signals = this.signals.filter((i) => i.id !== item.id);
          this.total = Math.max(0, this.total - 1);
          this.sharedService.showToast({ title: 'Signal deleted.' });
        },
        error: () => {
          this.deletingId = null;
          this.sharedService.showToast({ title: 'Could not delete signal.' });
        },
      });
  }
}