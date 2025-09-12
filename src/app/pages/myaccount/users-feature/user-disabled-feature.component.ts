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
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/module.d-DBDMCw5I';
import { MatFormFieldModule } from '@angular/material/module.d-vndDeG-q';
import { MatRadioModule } from '@angular/material/radio';

@Component({
  selector: 'app-user-feature',
  imports: [
    FormsModule,
    MatDialogModule,
    
        ReactiveFormsModule,
        CommonModule,
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
    comment: false,
  };

  errorMessage = '';
  loading = false;
  traderId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private featureService: DisabledService,
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
alert(this.traderId)
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
