import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

// App Services / Components
import { MaterialModule } from '../../../material.module';
import { CoreService } from '../../../services/core.service';
import { CryptoService } from '../crypto/crypto.service';
import { SharedService } from '../../../shared/shared.service';
import { TraderService } from '../../../../app/appstate/trader.service';
import { UserFeatureModalComponent } from '../users-feature/user-disabled-feature.component';
import {
  ReasonDialogComponent,
  ReasonDialogResult,
} from './reason-dialog/reason-dialog.component';

type UserTab = 'all' | 'flagged' | 'banned';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatMenuModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  private sharedService = inject(SharedService);

  errorMessage = '';
  selectedCryptoId = '';
  loading = false;
  isUpdatingWallet = false;

  activeTab: UserTab = 'all';
  searchTerm = '';
  private searchSubject = new Subject<string>();

  totalUsers = 0;
  pageSize = 10;
  pageIndex = 0;

  displayedColumns: string[] = [
    'imageUrl',
    'userName',
    'country',
    'phoneNumber',
    'email',
    'walletBalance',
    'boosterBalance',
    'profit',
    'referralCount',
    'status',
    'createdAt',
    'actions',
  ];

  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private settings: CoreService,
    private cryptoService: CryptoService,
    private traderService: TraderService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.pageIndex = 0;
      this.fetchUsers();
    });
    this.fetchUsers();
  }

  // ---------- Tabs ----------
  onTabChange(index: number) {
    this.activeTab = index === 0 ? 'all' : index === 1 ? 'flagged' : 'banned';
    this.pageIndex = 0;
    this.fetchUsers();
  }

  // ---------- Data loading ----------
  fetchUsers() {
    this.loading = true;
    this.errorMessage = '';

    const query = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchTerm || undefined,
    };

    const request$ =
      this.activeTab === 'flagged'
        ? this.traderService.listFlaggedAccounts(query)
        : this.activeTab === 'banned'
        ? this.traderService.listBannedAccounts(query)
        : this.traderService.getAllTraders(query);

    request$.subscribe({
      next: (res: any) => {
        this.dataSource.data = res.data ?? [];
        this.totalUsers = res.total ?? 0;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load users.';
        this.loading = false;
      },
    });
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.fetchUsers();
  }

  applyFilter(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.trim();
    this.searchSubject.next(this.searchTerm);
  }

  // ---------- Navigation ----------
  onSetupReview(id: string) {
    this.selectedCryptoId = id;
    this.router.navigate(['/myaccount/review', this.encode(id)]);
  }

  onViewProfile(id: string) {
    this.router.navigate(['/myaccount/profile', this.encode(id)]);
  }

  onDisableTraderFeature(id: string) {
    this.router.navigate(['/myaccount/users-feature', this.encode(id)]);
  }

  private encode(id: string): string {
    return btoa(id);
  }

  // ---------- Feature toggle (existing) ----------
  openFeatureModal(user: any) {
    const dialogRef = this.dialog.open(UserFeatureModalComponent, {
      width: '400px',
      data: { ...user },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.traderService.disabledUserFeature({ traderId: user.id, result }).subscribe({
        next: () => {
          this.sharedService.showToast({
            title: `${user.lastName} ${user.firstName} wallet has been successfully updated.`,
          });
          this.isUpdatingWallet = false;
        },
        error: (err) => {
          this.sharedService.showToast({ title: `${err?.error?.message ?? 'Update failed'}` });
          this.isUpdatingWallet = false;
        },
      });
    });
  }

  // ---------- Flag / Unflag ----------
  onFlagUser(user: any) {
    const ref = this.dialog.open(ReasonDialogComponent, {
      width: '440px',
      data: {
        title: 'Flag Account',
        actionLabel: 'Flag Account',
        userDisplayName: this.displayName(user),
        danger: false,
      },
    });

    ref.afterClosed().subscribe((result: ReasonDialogResult | undefined) => {
      if (!result) return;
      this.traderService.flagAccount(user._id, { reason: result.reason }).subscribe({
        next: () => {
          this.sharedService.showToast({ title: `${this.displayName(user)} has been flagged.` });
          this.fetchUsers();
        },
        error: (err) =>
          this.sharedService.showToast({ title: err?.error?.message ?? 'Failed to flag account.' }),
      });
    });
  }

  onUnflagUser(user: any) {
    this.traderService.unflagAccount(user._id).subscribe({
      next: () => {
        this.sharedService.showToast({ title: `${this.displayName(user)} has been unflagged.` });
        this.fetchUsers();
      },
      error: (err) =>
        this.sharedService.showToast({ title: err?.error?.message ?? 'Failed to unflag account.' }),
    });
  }

  // ---------- Ban / Restore ----------
  onBanUser(user: any) {
    const ref = this.dialog.open(ReasonDialogComponent, {
      width: '440px',
      data: {
        title: 'Ban Account',
        actionLabel: 'Ban Account',
        userDisplayName: this.displayName(user),
        danger: true,
      },
    });

    ref.afterClosed().subscribe((result: ReasonDialogResult | undefined) => {
      if (!result) return;
      this.traderService.banAccount(user._id, { reason: result.reason }).subscribe({
        next: () => {
          this.sharedService.showToast({ title: `${this.displayName(user)} has been banned.` });
          this.fetchUsers();
        },
        error: (err) =>
          this.sharedService.showToast({ title: err?.error?.message ?? 'Failed to ban account.' }),
      });
    });
  }

  onRestoreUser(user: any) {
    this.traderService.restoreAccount(user._id).subscribe({
      next: () => {
        this.sharedService.showToast({ title: `${this.displayName(user)} has been restored.` });
        this.fetchUsers();
      },
      error: (err) =>
        this.sharedService.showToast({ title: err?.error?.message ?? 'Failed to restore account.' }),
    });
  }

  // ---------- Export ----------
  exportToCSV() {
    const rows = this.dataSource.data;
    if (!rows.length) return;

    const csvData = rows.map((user: any) => ({
      Username: user.userName,
      Email: user.email,
      Phone: user.phoneNumber,
      Country: user.country,
      Wallet: user.walletBalance,
      Booster: user.tradeRewardCashWalletBalance,
      Profit: user.profit,
      Referrals: user.referralCount,
      Status: this.userStatus(user),
      CreatedAt: new Date(user.createdAt).toLocaleString(),
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `users-${this.activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // ---------- Helpers ----------
  displayName(user: any): string {
    return user?.userName ?? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  }

  userStatus(user: any): 'Banned' | 'Flagged' | 'Active' {
    if (user?.isBanned) return 'Banned';
    if (user?.isFlagged) return 'Flagged';
    return 'Active';
  }
}