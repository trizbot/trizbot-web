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
  /**
   * 'plans'    — shows a list of selectable plans; picking one invokes `onSubscribe`
   *              and the dialog handles its own loading / error state inline.
   * 'navigate' — shows a single confirmation CTA; the caller is responsible for
   *              the actual navigation once the dialog resolves.
   */
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

@Component({
  selector: 'app-subscribe-prompt-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './subscribe-prompt-dialog.component.html',
  styleUrls: ['./subscribe-prompt-dialog.component.scss'],
})
export class SubscribePromptDialogComponent implements OnDestroy {
  /** Plan key currently being submitted, or null when idle. */
  submittingPlan: string | null = null;
  /** Human-readable error from the last failed subscribe attempt, if any. */
  errorMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<SubscribePromptDialogComponent, SubscribePromptDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: SubscribePromptDialogData,
  ) {}

  get isPlansMode(): boolean {
    return this.data.mode === 'plans';
  }

  selectPlan(plan: SubscribePromptPlan): void {
    if (!this.data.onSubscribe || this.submittingPlan) return;

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