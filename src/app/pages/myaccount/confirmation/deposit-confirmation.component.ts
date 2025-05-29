import { Component, inject, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';
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
import { GetTraderResBody,GetDepositResBody } from '../../../../app/services/auth.type';
import { ActivatedRoute } from '@angular/router';

import { MatSnackBar } from '@angular/material/snack-bar';



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
  templateUrl: './deposit-confirmation.component.html',
  styleUrls: ['./deposit-confirmation.component.scss'],
})
export class DepositConfirmationComponent implements OnInit {

  private htmlElement!: HTMLHtmlElement;
  private sharedService = inject(SharedService);
    
     payment_status: string;
     pay_address: string;
     price_amount: number;
     price_currency: string;
     pay_amount: number;
     pay_currency: string;
     network: string;
     
     expiration_estimate_date!: string;
     valid_until!: string;
     expirationDate!: Date;
    
    
     countdown: { hours: number; minutes: number; seconds: number } | null = null;
     
  private timerSubscription: Subscription = new Subscription();


  errorMessage: string = '';
  loading: boolean = false;
  paymentId: string ;
    totalSeconds = 0; // Initialize to 0
  displayTime = '00:00';
  intervalId: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private investService: InvestmentService,
    private traderService: TraderService,
    private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const encodedId = params.get('id');
      if (encodedId) {
        this.paymentId = atob(encodedId); 
      }
    });

  
this.getPaymentWalletAddress();


  }
  



  startCountdown() {
    this.updateDisplay();
    this.intervalId = setInterval(() => {
      if (this.totalSeconds > 0) {
        this.totalSeconds--;
        this.updateDisplay();
        this.updateWalletBalance();
      } else {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }

  updateDisplay() {
    const minutes = Math.floor(this.totalSeconds / 60);
    const seconds = this.totalSeconds % 60;
    this.displayTime = `${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }


updateWalletBalance(){
  this.traderService.fundWallet().subscribe({
    next: (res) => {
// no need of response
    },
    error: (err) => {
      this.errorMessage = '';
    }
  });
}


getPaymentWalletAddress() {
  this.traderService.getPaymentWalletAddress().subscribe({
    next: (res: GetDepositResBody[]) => {
      if (res.length > 0) {
        const data = res[0]; // Get the first object from the array
        this.payment_status = data.payment_status;
        this.pay_address = data.pay_address;
        this.price_amount = data.price_amount;
        this.price_currency = data.price_currency.toUpperCase();
        this.pay_amount = data.pay_amount;
        this.pay_currency = data.pay_currency.toUpperCase();
        this.network = data.network.toUpperCase();
        this.expiration_estimate_date = data.expiration_estimate_date;
        this.expirationDate = new Date(this.expiration_estimate_date);

        this.valid_until = data.valid_until;
         // Calculate totalSeconds based on expiration_estimate_date
          const now = new Date();
          const expire = new Date(this.expiration_estimate_date);
          this.totalSeconds = Math.max(0, Math.floor((expire.getTime() - now.getTime()) / 1000));
          this.startCountdown();

      } else {
        this.errorMessage ='No payment data received.';
      }
    },
    error: (err) => {
      this.errorMessage = '';
      
    }
  });
}



      copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text).then(() => {
          // Optional: show a toast or snackbar
          this.snackBar.open('Wallet address copied!', 'Close', {
            duration: 2000
          });
        });
      }
      


  ngOnDestroy(): void {
    this.timerSubscription.unsubscribe();
    clearInterval(this.intervalId);
  }







  

}
