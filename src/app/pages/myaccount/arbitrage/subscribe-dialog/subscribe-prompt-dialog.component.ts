import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

/** A single selectable plan shown in 'plans' mode. */
export interface SubscribePromptPlan {
  key: string;
  label: string;
  price: number;
  durationDays: number;
  /** Optional "Best value" ribbon. */
  recommended?: boolean;
}

export interface SubscribePromptDialogData {
  /** Dialog heading. */
  title: string;
  /** Supporting copy shown under the heading. */
  description: string;
  /** Material icon name shown in the header badge (defaults to 'lock'). */
  icon?: string;

  mode: 'plans' | 'navigate';
  /** Required when mode === 'plans'. */
  plans?: SubscribePromptPlan[];
  /** Required when mode === 'plans'. Should perform the subscribe API call. */
  onSubscribe?: (planKey: string) => Observable<unknown>;
  /** Required when mode === 'navigate'. Label for the CTA button. */
  navigateLabel?: string;
}

export interface SubscribePromptDialogResult {
  subscribed?: boolean;
  plan?: string;
  navigate?: boolean;
}

/**
 * Internal screen the dialog is currently showing. Distinct from
 * SubscribePromptDialogData['mode'] — 'confirm' is a client-side step
 * inserted between picking a plan and actually charging it, so callers
 * of this dialog never need to know about it or pass anything extra in.
 */
type DialogView = 'plans' | 'confirm' | 'navigate';

@Component({
  selector: 'app-subscribe-prompt-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './subscribe-prompt-dialog.component.html',
  styleUrls: ['./subscribe-prompt-dialog.component.scss'],
})
export class SubscribePromptDialogComponent implements OnDestroy {
  /** Which screen of the dialog is currently showing. */
  view: DialogView;

  /** Plan the user tapped in the plans list, awaiting confirmation. */
  selectedPlan: SubscribePromptPlan | null = null;

  /** Plan key currently being submitted, or null when idle. */
  submittingPlan: string | null = null;
  /** Human-readable error from the last failed subscribe attempt, if any. */
  errorMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<SubscribePromptDialogComponent, SubscribePromptDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: SubscribePromptDialogData,
  ) {
    this.view = this.data.mode === 'navigate' ? 'navigate' : 'plans';
  }

  get isPlansMode(): boolean {
    return this.data.mode === 'plans';
  }

  get isPlansView(): boolean {
    return this.view === 'plans';
  }

  get isConfirmView(): boolean {
    return this.view === 'confirm';
  }

  get isNavigateView(): boolean {
    return this.view === 'navigate';
  }

  /** Selected plan's price per day, formatted for the preview screen. */
  get perDayPrice(): string {
    if (!this.selectedPlan) return '';
    return (this.selectedPlan.price / this.selectedPlan.durationDays).toFixed(2);
  }

  /**
   * Step 1 -> Step 2. Picking a plan no longer charges immediately — it
   * shows a preview/confirmation screen first.
   */
  choosePlan(plan: SubscribePromptPlan): void {
    if (this.submittingPlan) return;
    this.errorMessage = null;
    this.selectedPlan = plan;
    this.view = 'confirm';
  }

  /** Step 2 -> Step 1. Back out of the preview without charging anything. */
  backToPlans(): void {
    if (this.submittingPlan) return;
    this.selectedPlan = null;
    this.errorMessage = null;
    this.view = 'plans';
  }

  /** Step 2 confirmed — actually perform the subscribe call. */
  confirmSubscribe(): void {
    const plan = this.selectedPlan;
    if (!plan || !this.data.onSubscribe || this.submittingPlan) return;

    this.errorMessage = null;
    this.submittingPlan = plan.key;

    this.data
      .onSubscribe(plan.key)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.submittingPlan = null;
        }),
      )
      .subscribe({
        next: () => {
          this.dialogRef.close({ subscribed: true, plan: plan.key });
        },
        error: () => {
          this.errorMessage =
            'We could not activate this plan. Please check your wallet balance and try again.';
        },
      });
  }

  confirmNavigate(): void {
    this.dialogRef.close({ navigate: true });
  }

  dismiss(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}