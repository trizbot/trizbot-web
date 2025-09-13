import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedService } from '../../../../app/shared/shared.service';
import { DisabledService } from './user-disabled-feature.services';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { TraderService } from '../../../../app/appstate/trader.service';

@Component({
  selector: 'app-user-feature',
  standalone: true, // ✅ needed if you're using imports array
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
  ],
  templateUrl: 'user-disabled-feature.component.html',
})
export class UserFeatureModalComponent implements OnInit {
  private sharedService = inject(SharedService);

  featureData = {
    depositDisabled: false,
    walletDisabled: false,
    withdrawalDisabled: false,
  };

  errorMessage = '';
  loading = false;
  traderId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private featureService: DisabledService,
    private traderService: TraderService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const encodedId = params.get('id');
      if (encodedId) {
        this.traderId = atob(encodedId);
      }
    });

    this.getCurrentTrader();
  }

  getCurrentTrader() {
    this.traderService.getTraderById(this.traderId).subscribe({
      next: (res: GetTraderResBody) => {
        // ✅ directly assign to featureData so checkboxes reflect initial state
        this.featureData = {
          depositDisabled: res.data.isDepositDisabled ?? false,
          walletDisabled: res.data.isWalletDisabled ?? false,
          withdrawalDisabled: res.data.isWithdrawalDisabled ?? false,
        };
      },
      error: () => {
        this.errorMessage = 'Failed to load trader details.';
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

    const { depositDisabled, walletDisabled, withdrawalDisabled } = this.featureData;

    this.featureService.createDisabledFeature(
      depositDisabled,
      walletDisabled,
      withdrawalDisabled,
      this.traderId
    ).subscribe({
      next: () => {
        this.sharedService.showToast({
          title: `Trader selected feature is successfully updated.`,
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
