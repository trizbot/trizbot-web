import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../../material.module';
import { SharedService } from '../../../shared/shared.service';
import { AcademyService } from './academy.service';
import { CreateCourseDialogComponent } from './create-course-dialog/create-course-dialog.component';
import { PurchaseCourseDialogComponent } from './purchase-course-dialog/purchase-course-dialog.component';
import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../app/services/auth.type';

import {
  CATEGORY_OPTIONS,
  Course,
  CoursePurchase,
  CourseSale,
  LEVEL_OPTIONS,
} from './model/academy.model';

type MainTab = 'browse' | 'my-courses' | 'purchased' | 'sales';

@Component({
  selector: 'app-academy',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './academy.component.html',
  styleUrls: ['./academy.component.scss'],
})
export class AcademyComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private destroy$ = new Subject<void>();
  private traderService = inject(TraderService);

  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly levelOptions = LEVEL_OPTIONS;

  activeTab: MainTab = 'browse';

  filterForm = new FormGroup({
    search: new FormControl(''),
    category: new FormControl<string>(''),
    level: new FormControl<string>(''),
  });

  // ---- Browse ----
  courses: Course[] = [];
  coursesLoading = false;
  coursesError = false;
  isSuperAdmin = false;

  // ---- My Courses (created) ----
  myCourses: Course[] = [];
  myCoursesLoading = false;
  myCoursesError = false;
  deletingCourseId: string | null = null;

  // ---- Purchased ----
  purchases: CoursePurchase[] = [];
  purchasesLoading = false;
  purchasesError = false;

  // ---- Sales ----
  sales: CourseSale[] = [];
  salesLoading = false;
  salesError = false;

  constructor(private academyService: AcademyService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadCourses();
    this.getTrader();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadCourses());
  }


getTrader(): void {
   this.traderService
        .getTrader()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: GetTraderResBody) => {
            this.isSuperAdmin = !!res.data?.isSuperAdmin;
          },
          error: (err) => {
          },
        });
      }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: MainTab): void {
    this.activeTab = tab;
    if (tab === 'browse' && this.courses.length === 0) this.loadCourses();
    if (tab === 'my-courses' && this.myCourses.length === 0) this.loadMyCourses();
    if (tab === 'purchased' && this.purchases.length === 0) this.loadPurchases();
    if (tab === 'sales' && this.sales.length === 0) this.loadSales();
  }

  // ---------------------------------------------------------------------
  // Browse
  // ---------------------------------------------------------------------

  loadCourses(): void {
    this.coursesLoading = true;
    this.coursesError = false;
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
          this.courses = [];
          this.coursesLoading = false;
          this.coursesError = true;
        },
      });
  }

  categoryLabel(value?: string): string {
    return this.categoryOptions.find((c) => c.value === value)?.label || 'General';
  }

  levelLabel(value?: string): string {
    return this.levelOptions.find((l) => l.value === value)?.label || '';
  }

  initials(course: Course): string {
    const f = course.instructor.firstName?.charAt(0) || '';
    const l = course.instructor.lastName?.charAt(0) || '';
    return (f + l).toUpperCase() || '?';
  }

  trackByCourseId(_index: number, course: Course): string {
    return course.id;
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
    this.myCoursesError = false;
    this.academyService.myCourses().subscribe({
      next: (res) => {
        this.myCourses = res;
        this.myCoursesLoading = false;
      },
      error: () => {
        this.myCourses = [];
        this.myCoursesLoading = false;
        this.myCoursesError = true;
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
    if (!course?.id || this.deletingCourseId) return;
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
    this.purchasesError = false;
    this.academyService.myPurchases().subscribe({
      next: (res) => {
        this.purchases = res;
        this.purchasesLoading = false;
      },
      error: () => {
        this.purchases = [];
        this.purchasesLoading = false;
        this.purchasesError = true;
      },
    });
  }

  loadSales(): void {
    this.salesLoading = true;
    this.salesError = false;
    this.academyService.mySales().subscribe({
      next: (res) => {
        this.sales = res;
        this.salesLoading = false;
      },
      error: () => {
        this.sales = [];
        this.salesLoading = false;
        this.salesError = true;
      },
    });
  }
}