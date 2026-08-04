// academy.component.ts

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { AcademyService } from './academy.service';
import { CreateCourseDialogComponent } from './create-course-dialog/create-course-dialog.component';
import { PurchaseCourseDialogComponent } from './purchase-course-dialog/purchase-course-dialog.component';

import {
  CATEGORY_OPTIONS,
  Course,
  CoursePurchase,
  CourseSale,
  LEVEL_OPTIONS,
} from './model/academy.model';
import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { Trader } from '../../../../app/appstate/appstate-model';

type MainTab = 'browse' | 'my-courses' | 'purchased' | 'sales';

@Component({
  selector: 'app-academy',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './academy.component.html',
  styleUrls: ['./academy.component.scss'],
})
export class AcademyComponent implements OnInit {
  private sharedService = inject(SharedService);
  private destroy$ = new Subject<void>();

  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly levelOptions = LEVEL_OPTIONS;

  activeTab: MainTab = 'browse';
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

  // ---- Browse ----
  filterForm = new FormGroup({
    search: new FormControl(''),
    category: new FormControl<string>(''),
    level: new FormControl<string>(''),
  });

  courses: Course[] = [];
  coursesLoading = false;

  // ---- My Courses (created) ----
  myCourses: Course[] = [];
  myCoursesLoading = false;
  deletingCourseId: string | null = null;

  // ---- Purchased ----
  purchases: CoursePurchase[] = [];
  purchasesLoading = false;

  // ---- Sales ----
  sales: CourseSale[] = [];
  salesLoading = false;

  constructor( private traderService: TraderService,private academyService: AcademyService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadCourses();
    this.getCurrentTrader();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadCourses());
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
    if (tab === 'browse' && this.courses.length === 0) this.loadCourses();
    if (tab === 'my-courses') this.loadMyCourses();
    if (tab === 'purchased') this.loadPurchases();
    if (tab === 'sales') this.loadSales();
  }

  // ---------------------------------------------------------------------
  // Browse
  // ---------------------------------------------------------------------

  loadCourses(): void {
    this.coursesLoading = true;
    const { search, category, level } = this.filterForm.getRawValue();

    this.academyService
      .getCourses({
        search: search || undefined,
        category: (category as any) || undefined,
        level: (level as any) || undefined,
        page: 1,
        limit: 40,
      })
      .subscribe({
        next: (res) => {
          this.courses = res;
          this.coursesLoading = false;
        },
        error: () => {
          this.coursesLoading = false;
        },
      });
  }

  categoryLabel(value?: string): string {
    return this.categoryOptions.find((c) => c.value === value)?.label || 'General';
  }

  levelLabel(value?: string): string {
    return this.levelOptions.find((l) => l.value === value)?.label || '';
  }

  openPurchaseDialog(course: Course): void {
    const ref = this.dialog.open(PurchaseCourseDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: { course },
    });

    ref.afterClosed().subscribe((purchased) => {
      if (purchased) {
        this.sharedService.showToast({ title: `You now have access to "${course.title}".` });
        if (this.activeTab === 'purchased') this.loadPurchases();
      }
    });
  }

  // ---------------------------------------------------------------------
  // My Courses
  // ---------------------------------------------------------------------

  loadMyCourses(): void {
    this.myCoursesLoading = true;
    this.academyService.myCourses().subscribe({
      next: (res) => {
        this.myCourses = res;
        this.myCoursesLoading = false;
      },
      error: () => {
        this.myCoursesLoading = false;
      },
    });
  }

  openCreateCourseDialog(existing?: Course): void {
    const ref = this.dialog.open(CreateCourseDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { existing },
    });

    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.sharedService.showToast({
          title: existing ? 'Course updated.' : 'Course published.',
        });
        this.loadMyCourses();
        if (this.activeTab === 'browse') this.loadCourses();
      }
    });
  }

  deleteCourse(course: Course): void {
    this.deletingCourseId = course.id;
    this.academyService.deleteCourse(course.id).subscribe({
      next: () => {
        this.deletingCourseId = null;
        this.sharedService.showToast({ title: 'Course removed.' });
        this.loadMyCourses();
      },
      error: (err) => {
        this.deletingCourseId = null;
        const message = err?.error?.message || 'Could not delete this course.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  // ---------------------------------------------------------------------
  // Purchased / Sales
  // ---------------------------------------------------------------------

  loadPurchases(): void {
    this.purchasesLoading = true;
    this.academyService.myPurchases().subscribe({
      next: (res) => {
        this.purchases = res;
        this.purchasesLoading = false;
      },
      error: () => {
        this.purchasesLoading = false;
      },
    });
  }

  loadSales(): void {
    this.salesLoading = true;
    this.academyService.mySales().subscribe({
      next: (res) => {
        this.sales = res;
        this.salesLoading = false;
      },
      error: () => {
        this.salesLoading = false;
      },
    });
  }
}