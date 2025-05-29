import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MaterialModule } from 'src/app/material.module';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CoreService } from '../../../services/core.service';
import { SharedService } from '../../../shared/shared.service';
import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InvestmentService } from '../invest/investment.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';




@Component({
  selector: 'app-deposit',
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
  templateUrl: './deposit.component.html',
})
export class DepositComponent implements OnInit {
  
      private htmlElement!: HTMLHtmlElement;
      private sharedService = inject(SharedService);
  
  
    errorMessage: string = '';
    loading: boolean = false;
    traderId: string;
    isNormalEntityType: boolean = false;
  
    entityName: string;
    entity: string;

    // currencies: string[] = [
    //   "btg", "eth", "xmr", "zec", "xvg", "ada", "ltc", "bch", "qtum", "dash",
    //   "xlm", "xrp", "xem", "dgb", "lsk", "doge", "trx", "kmd", "rep", "bat",
    //   "ark", "waves", "bnb", "xzc", "nano", "tusd", "vet", "zen", "grs", "fun",
    //   "neo", "gas", "pax", "usdc", "ont", "xtz", "link", "rvn", "bnbmainnet",
    //   "zil", "bcd", "usdt", "usdterc20", "cro", "dai", "ht", "wabi", "busd",
    //   "algo", "usdttrc20", "gt", "stpt", "ava", "sxp", "uni", "okb", "btc"
    // ];
   

    currencies: string[] = [ "usdttrc20",'usdtbep20','usdtmatic' ];
   
    
    
    depositData = {
      amount: 0,
      pay_currency: '',
      note: 'Deposit Wallet Creation',
    };
    constructor(
      private route: ActivatedRoute,
      private investService: InvestmentService,
      private traderService: TraderService,
      private router: Router
    ) {}
  
ngOnInit(): void {

    this.getCurrentTrader();
    
  }

  getCurrentTrader(){
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.entityName =res.data.entityName;
        this.traderId = res.data._id;
        if (this.entityName=="Admin") {
          this.isNormalEntityType=true;
          this.entity='admins';
          }
          else if (this.entityName=="Trader") {
          this.isNormalEntityType=true;
          this.entity='traders';
          } else{
            this.isNormalEntityType =false;
            this.entity='traders';
          }
      },
      error: (err) => {
        this.errorMessage = '';
      }
    });
  }
 
  onCreateDeposit(){
      this.errorMessage = '';
      this.loading= true;
      const timestamp = Date.now(); 
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase(); 
      const reference = `IRV${timestamp}${randomStr}`;
      
      const { amount,pay_currency, note} = this.depositData;
      
   
      if (!note) {
        this.errorMessage = 'Please enter a reasons.';
        this.loading = false;
        return;
      }
   
      if (!amount) {
        this.errorMessage = 'Please enter amount.';
        this.loading = false;
        return;
      }
     
      this.traderService.deposits(
        amount,reference,pay_currency, note,
        this.entity
      ).subscribe({
        next: (response) => {
            this.router.navigate(['/myaccount/confirmation']);
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

