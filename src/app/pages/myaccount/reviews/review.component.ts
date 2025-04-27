import { Component, inject, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { AuthService } from '../../../services/auth.service';
import { CryptoService } from '../crypto/crypto.service';
import { InvestmentService } from '../invest/investment.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { CoreService } from '../../../services/core.service';
import { SharedService } from '../../../shared/shared.service';
import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { ActivatedRoute } from '@angular/router';

@Component({
selector: 'app-review',
  standalone: true,
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
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

  templateUrl: './review.component.html',
  styleUrls: ['./review.component.scss'],
})
export class ReviewComponent implements OnInit {

    private htmlElement!: HTMLHtmlElement;
    private sharedService = inject(SharedService);


  errorMessage: string = '';
  errorCreditMessage: string = '';
  loading: boolean = false;
  loadingCredit: boolean = false;
  traderId: string;
  

  reviewData = {
    status: '',
    comment: '',
  };

  
  creditData = {
    amount: '',
    reason: '',
    transactionPin: '',
  };
  constructor(
    private route: ActivatedRoute,
    private investService: InvestmentService,
    private traderService: TraderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const encodedId = params.get('id');
      if (encodedId) {
        this.traderId = atob(encodedId); 
      }
    });

}





onCreateReview(): void {
    this.errorMessage = '';
    this.loading = true;
  
    const { comment, status } = this.reviewData;
    const traderId = this.traderId;
 
    if (!comment) {
      this.errorMessage = 'Please enter a comment/description.';
      this.loading = false;
      return;
    }
  
    this.traderService.reviewTraders(
      comment,
      status,
      traderId
    ).subscribe({
      next: (response) => {
        this.sharedService.showToast({
          title: `The trader's profile has been successfully reviewed.`,
        });
        this.loading = false;
      },
      error: (err) => {
        const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
        this.errorMessage = message;
        this.loading = false;
      },
    });
  }
  


  onCreateCreditManaual(): void {
    this.errorCreditMessage = '';
    this.loadingCredit = true;
  
    const { amount,transactionPin,reason} = this.creditData;
    const traderId = this.traderId;
 
    if (!reason) {
      this.errorCreditMessage = 'Please enter a reasons.';
      this.loadingCredit = false;
      return;
    }
 
    if (!amount) {
      this.errorCreditMessage = 'Please enter a comment/description.';
      this.loadingCredit = false;
      return;
    }
  
    this.traderService.creditTraders(
      amount,
      transactionPin,reason,
      traderId
    ).subscribe({
      next: (response) => {
        this.sharedService.showToast({
          title: `The trader's account has been successfully credited manually.`,
        });
        this.loadingCredit = false;
      },
      error: (err) => {
        const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
        this.errorCreditMessage = message;
        this.loadingCredit = false;
      },
    });
  }
  






}