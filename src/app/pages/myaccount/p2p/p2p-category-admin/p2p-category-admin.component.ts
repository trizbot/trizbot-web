import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { FeedCategoryItem } from '../../feed/model/feed.model';
import { P2pCategoryItem } from '../model/p2p-category.model';
import { P2pCategoryService } from '../service/p2p-category.service';
// import { FeedCategoryItem } from '../p2p-category.model';
// import { P2pCategoryService } from '../p2p-category.service';

@Component({
  selector: 'app-p2p-category-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './p2p-category-admin.component.html',
//   styleUrls: ['./p2p-category-admin.component.scss'],
})
export class P2pCategoryAdminComponent implements OnInit {
  categories: P2pCategoryItem[] = [];
  loading = false;
  saving = false;
  deletingId: string | null = null;
  editingId: string | null = null;

  form = new FormGroup({
    category: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    reference: new FormControl<string>('', { nonNullable: true }),
  });

  constructor(
    private categoryService: P2pCategoryService,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.categoryService.getFeedCategory().subscribe({
      next: (res) => {
        this.categories = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.sharedService.showToast({ title: 'Could not load categories.' });
      },
    });
  }

  startEdit(item: FeedCategoryItem): void {
    this.editingId = item.id;
    this.form.setValue({ category: item.category, reference: item.reference || '' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ category: '', reference: '' });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const value = this.form.getRawValue();
    const req$ = this.editingId
      ? this.categoryService.updateFeedCategory(this.editingId, value)
      : this.categoryService.createFeedCategory(value);

    req$.subscribe({
      next: (res) => {
        this.categories = res;
        this.saving = false;
        this.sharedService.showToast({ title: this.editingId ? 'Category updated.' : 'Category created.' });
        this.cancelEdit();
      },
      error: (err) => {
        this.saving = false;
        const message = err?.error?.message || 'Could not save this category.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }

  remove(item: FeedCategoryItem): void {
    if (!window.confirm(`Delete the "${item.category}" category permanently?`)) return;
    this.deletingId = item.id;
    this.categoryService.deleteFeedCategory(item.id).subscribe({
      next: () => {
        this.categories = this.categories.filter((c) => c.id !== item.id);
        this.deletingId = null;
        this.sharedService.showToast({ title: 'Category deleted.' });
      },
      error: (err) => {
        this.deletingId = null;
        const message = err?.error?.message || 'Could not delete this category.';
        this.sharedService.showToast({ title: Array.isArray(message) ? message.join(', ') : message });
      },
    });
  }
}