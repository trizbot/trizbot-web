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
  selector: 'app-invest',
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
  templateUrl: './investment.component.html',
  styleUrls: ['./investment.component.scss'],
})
export class InvestmentComponent implements OnInit {

  private htmlElement!: HTMLHtmlElement;
  private sharedService = inject(SharedService);

  investData = {
    transactionType: 'Debit',
    description: '',
    amount: '',
  };

  errorMessage: string = '';
  loading: boolean = false;
  cryptoId: string ;

  constructor(
    private route: ActivatedRoute,
    private investService: InvestmentService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const encodedId = params.get('id');
      if (encodedId) {
        this.cryptoId = atob(encodedId); 
      }
    });

    
  }
  onCreateInvestment(): void {
    this.errorMessage = '';
    this.loading = true;
  
    const { description, transactionType, amount } = this.investData;
    const cryptoId = this.cryptoId;

    const timestamp = Date.now(); // or new Date().toISOString() for readable format
const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase(); 
const reference = `IRV${timestamp}${randomStr}${this.cryptoId}`;

  
    if (!amount || isNaN(+amount) || +amount <= 0) {
      this.errorMessage = 'Please enter a valid investment amount.';
      this.loading = false;
      return;
    }
  
    this.investService.createInvestment(
      reference,
      description,
      transactionType,
      +amount,
      cryptoId
    ).subscribe({
      next: (response) => {
        this.sharedService.showToast({
          title: `Investment created successfully`,
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
  



  

}
