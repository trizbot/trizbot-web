import { Component, inject, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { AuthService } from '../../../services/auth.service';
import { CryptoService } from '../crypto/crypto.service';
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
import { CashRewardService } from './cash-reward.service';

@Component({
  selector: 'app-cash-reward',
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
  templateUrl: './cash-reward.component.html',
  styleUrls: ['./cash-reward.component.scss'],
})
export class TraderCashRewardComponent implements OnInit {
  private htmlElement!: HTMLHtmlElement;
  private sharedService = inject(SharedService);

  creatorName: string = '';

   casheRewardData = {
    amount: 0,
    transactionPin: '',
    tradeRewardCashType: '',
    creatorName: '',
    reason: '',
    email: '',
  };
  

  errorMessage: string = '';
  loading: boolean = false;
  imageUrl: string;


  percentageOptions: number[] = Array.from({ length: 100 }, (_, i) => i + 1);
  expiryOptions: number[] = Array.from({ length: 100 }, (_, i) => i + 1);


  constructor(
    private settings: CoreService,
    private cashService: CashRewardService,
    private traderService: TraderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.htmlElement = document.querySelector('html')!;
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.creatorName = `${res.data.firstName} ${res.data.lastName}`;
        this.casheRewardData.creatorName = this.creatorName;
      },
    });
  }

  files: File[] = []; 
  onSelect(event: any) {
    this.files.push(...event.addedFiles);
  }

  onRemove(event:any){
    this.files.splice(this.files.indexOf(event),1);
  }
  createCashReward() {
    this.errorMessage = '';
    this.loading = true;

    if (!this.casheRewardData.email) {
      this.errorMessage = 'Please enter a valid email address.';
      this.loading = false;
      return;
    }
    if (!this.casheRewardData.amount || this.casheRewardData.amount <= 0) {
      this.errorMessage = 'Please enter a valid amount.';
      this.loading = false;
      return;
    }
    if (!this.casheRewardData.transactionPin || this.casheRewardData.transactionPin.trim() === '') {
      this.errorMessage = 'Please enter a valid transaction pin.';
      this.loading = false;
      return;
    }

    if (!this.casheRewardData.tradeRewardCashType || this.casheRewardData.tradeRewardCashType.trim() === '') {
      this.errorMessage = 'Please enter a valid transaction type.';
      this.loading = false;
      return;
    }
  
   
    const { creatorName, tradeRewardCashType, amount, transactionPin,reason,email } = this.casheRewardData;
  
        this.cashService.createCashReward(
          creatorName,
          tradeRewardCashType,
          amount,
          transactionPin,
          reason,
          email
        
        ).subscribe({
          next: (response) => {
            this.sharedService.showToast({
              title: `${this.casheRewardData.amount} cash reward is created successfully`,
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
  
  


