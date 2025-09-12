import { Component, inject, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedService } from '../../../../app/shared/shared.service';
import { DisabledService } from './user-disabled-feature.services';

@Component({
  selector: 'app-user-feature',
  imports: [
    FormsModule,
    MatDialogModule,
    MatCheckboxModule,
  ],
  templateUrl: 'user-disabled-feature.component.html',
})
export class UserFeatureModalComponent implements OnInit {

  private sharedService = inject(SharedService);
 private htmlElement!: HTMLHtmlElement;
  featureData = {
    depositDisabled: false,
    walletDisabled: false,
    withdrawalDisabled: false,
    comment: false,
  };

  errorMessage: string = '';
  loading: boolean = false;
  traderId: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<UserFeatureModalComponent>,
    private route: ActivatedRoute,
     private router: Router,
    private featureService: DisabledService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const encodedId = params.get('id');
      if (encodedId) {
        this.traderId = atob(encodedId);
      }
    });
  }

  onDisabledFeature() {
    this.errorMessage = '';
    this.loading = true;

    if (!this.traderId) {
      this.errorMessage = 'Trader ID not found.';
      this.loading = false;
      return;
    }

    const { depositDisabled, walletDisabled, withdrawalDisabled, comment } = this.featureData;

    // Optional reference generation
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `IRV${timestamp}${randomStr}${this.traderId}`;

    this.featureService.createDisabledFeature(
      depositDisabled,
      walletDisabled,
      withdrawalDisabled,
      this.traderId
    ).subscribe({
      next: () => {
        this.sharedService.showToast({
          title: `Trader service updated successfully`,
        });
        this.loading = false;
      },
      error: (err) => {
        const message = err?.error?.message || 'An unexpected error occurred.';
        this.errorMessage = message;
        this.loading = false;
      },
    });
  }
}
