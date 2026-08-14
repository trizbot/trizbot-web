import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  CourseCategoryItem,
  CoursePurchase,
  CourseSale,
  LEVEL_OPTIONS,
} from './model/academy.model';
import { CourseDetailDialogComponent, CourseDetailDialogResult } from './course-detail-dialog/course-detail-dialog.component';

type MainTab = 'browse' | 'my-courses' | 'purchased' | 'sales' | 'categories';

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
  downloadingPurchaseId: string | null = null;

  // ---- Sales ----
  sales: CourseSale[] = [];
  salesLoading = false;
  salesError = false;

  // ---- Categories ----
  categories: CourseCategoryItem[] = [];
  categoriesLoading = false;
  categoriesError = false;
  addingCategory = false;

  categoryForm = new FormGroup({
    category: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  editingCategoryId: string | null = null;
  savingCategoryEdit = false;
  deletingCategoryId: string | null = null;

  categoryEditForm = new FormGroup({
    category: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(private academyService: AcademyService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadCourses();
    this.loadCategories();
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
          if (this.isSuperAdmin && this.activeTab === 'browse') {
            this.selectTab('categories');
          }
        },
        error: (err) => {},
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
    if (tab === 'categories' && this.categories.length === 0) this.loadCategories();
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
    if (!value) return 'General';
    const apiMatch = this.categories.find(
      (c) => (c as any).reference === value || c.category === value,
    );
    if (apiMatch) return apiMatch.category;
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

  /** Opens the read-only preview dialog before purchase. */
  openCourseDetail(course: Course, isPurchased = false): void {
    const ref = this.dialog.open(CourseDetailDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { course, isPurchased },
    });

    ref.afterClosed().subscribe((result: CourseDetailDialogResult) => {
      if (result?.action === 'purchase') {
        this.openPurchaseDialog(course);
      }
      if (result?.action === 'download') {
        this.downloadCourseFile(course);
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

  /**
   * Downloads the purchased course's file. Always prefers `pdfUrl` over
   * `attachmentUrl` (pdfUrl is the actual uploaded/hosted course file;
   * attachmentUrl is a legacy/external link). If the purchase record
   * itself doesn't carry a file url, falls back to fetching the full
   * course by id before giving up.
   */
  downloadPurchase(purchase: CoursePurchase): void {
    if (this.downloadingPurchaseId) return;

    const directUrl = purchase.course?.pdfUrl || purchase.course?.attachmentUrl;
    if (directUrl) {
      this.downloadingPurchaseId = purchase.id;
      this.fetchAndDownload(directUrl, purchase.course.title).finally(() => {
        this.downloadingPurchaseId = null;
      });
      return;
    }

    if (!purchase.course?.id) {
      this.sharedService.showToast({ title: 'No downloadable file is attached to this course.' });
      return;
    }

    // pdfUrl/attachmentUrl weren't populated on the purchase record itself —
    // look the course up directly so we don't fail on a stale/partial record.
    this.downloadingPurchaseId = purchase.id;
    this.academyService.getCourseById(purchase.course.id).subscribe({
      next: (course) => {
        const fileUrl = course.pdfUrl || course.attachmentUrl;
        if (!fileUrl) {
          this.downloadingPurchaseId = null;
          this.sharedService.showToast({ title: 'No downloadable file is attached to this course.' });
          return;
        }
        this.fetchAndDownload(fileUrl, course.title).finally(() => {
          this.downloadingPurchaseId = null;
        });
      },
      error: () => {
        this.downloadingPurchaseId = null;
        this.sharedService.showToast({ title: 'Could not fetch the course file. Try again.' });
      },
    });
  }

  downloadCourseFile(course: Course): void {
    const url = course.pdfUrl || course.attachmentUrl;
    if (!url) {
      this.sharedService.showToast({ title: 'No downloadable file is attached to this course.' });
      return;
    }
    this.fetchAndDownload(url, course.title);
  }

  /**
   * Forces an actual file download rather than a browser navigation.
   *
   * Why not just `<a href download>`: the `download` attribute is silently
   * ignored by browsers for cross-origin URLs (Cloudinary/S3/etc. are always
   * cross-origin from our app's domain), so that approach just opens the PDF
   * in a new tab instead of downloading it — no error, just wrong behavior.
   *
   * Instead we fetch the file as a Blob and download it via an object URL,
   * which works regardless of origin as long as the host allows the request
   * (CORS). If the fetch itself fails (network error, CORS block, 404), we
   * fall back to opening the raw URL in a new tab and tell the user, rather
   * than failing silently.
   */
  private async fetchAndDownload(url: string, title: string): Promise<void> {
    if (!url) {
      this.sharedService.showToast({ title: 'No downloadable file is attached to this course.' });
      return;
    }

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = this.buildDownloadFilename(title, url, blob.type);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Give the browser a moment to pick up the click before revoking.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      // Fallback: at least get the file in front of the user, even if we
      // couldn't force a "Save As" download (e.g. the host blocks CORS).
      this.sharedService.showToast({
        title: 'Could not auto-download the file — opening it in a new tab instead.',
      });
      window.open(url, '_blank', 'noopener');
    }
  }

  /** Builds a safe, extension-correct filename for the downloaded blob. */
  private buildDownloadFilename(title: string, url: string, mimeType: string): string {
    const safeTitle = (title || 'course-material')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 120);

    const extFromUrl = url.split('?')[0].split('.').pop();
    const extFromMime = mimeType?.split('/')?.pop();
    const ext = (extFromUrl && extFromUrl.length <= 5 ? extFromUrl : extFromMime) || 'pdf';

    return `${safeTitle}.${ext}`;
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

  // ---------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoriesError = false;
    this.academyService.getCourseCategory().subscribe({
      next: (res) => {
        this.categories = res;
        this.categoriesLoading = false;
      },
      error: () => {
        this.categories = [];
        this.categoriesLoading = false;
        this.categoriesError = true;
      },
    });
  }

  trackByCategoryId(_index: number, cat: CourseCategoryItem): string {
    return (cat as any).id ?? (cat as any)._id ?? cat.category;
  }

  addCategory(): void {
    if (this.categoryForm.invalid || this.addingCategory) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.addingCategory = true;
    const raw = this.categoryForm.getRawValue();
    const categoryName = raw.category.trim();

    this.academyService
      .createCourseCategory({
        category: categoryName,
        reference: this.generateCategoryReference(categoryName),
      })
      .subscribe({
        next: () => {
          this.addingCategory = false;
          this.categoryForm.reset({ category: '' });
          this.sharedService.showToast({ title: 'Category added.' });
          this.loadCategories();
        },
        error: (err) => {
          this.addingCategory = false;
          const message = err?.error?.message || 'Could not add this category.';
          this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
        },
      });
  }

  startEditCategory(cat: CourseCategoryItem): void {
    if (this.deletingCategoryId) return;
    this.editingCategoryId = (cat as any).id ?? (cat as any)._id ?? null;
    this.categoryEditForm.reset({ category: cat.category || '' });
  }

  cancelEditCategory(): void {
    this.editingCategoryId = null;
    this.savingCategoryEdit = false;
    this.categoryEditForm.reset({ category: '' });
  }

  saveEditCategory(cat: CourseCategoryItem): void {
    const id = (cat as any).id ?? (cat as any)._id;
    if (!id || this.categoryEditForm.invalid || this.savingCategoryEdit) {
      this.categoryEditForm.markAllAsTouched();
      return;
    }

    this.savingCategoryEdit = true;
    const categoryName = this.categoryEditForm.getRawValue().category.trim();

    this.academyService
      .updateCategory(id, {
        category: categoryName,
        reference: this.generateCategoryReference(categoryName),
      })
      .subscribe({
        next: () => {
          this.savingCategoryEdit = false;
          this.editingCategoryId = null;
          this.sharedService.showToast({ title: 'Category updated.' });
          this.loadCategories();
        },
        error: (err) => {
          this.savingCategoryEdit = false;
          const message = err?.error?.message || 'Could not update this category.';
          this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
        },
      });
  }

  deleteCategory(cat: CourseCategoryItem): void {
    const id = (cat as any).id ?? (cat as any)._id;
    if (!id || this.deletingCategoryId) return;

    const confirmed = window.confirm(`Delete the "${cat.category}" category? This can't be undone.`);
    if (!confirmed) return;

    this.deletingCategoryId = id;
    this.academyService.deleteCategory(id).subscribe({
      next: () => {
        this.deletingCategoryId = null;
        if (this.editingCategoryId === id) this.cancelEditCategory();
        this.sharedService.showToast({ title: 'Category removed.' });
        this.loadCategories();
      },
      error: (err) => {
        this.deletingCategoryId = null;
        const message = err?.error?.message || 'Could not delete this category.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  private generateCategoryReference(categoryName: string): string {
    const initials = categoryName
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 4) || 'CAT';

    const suffix = Date.now().toString(36).toUpperCase().slice(-4);

    return `${initials}-${suffix}`;
  }
}