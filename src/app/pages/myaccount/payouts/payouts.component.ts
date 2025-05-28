import { Component, inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../material.module';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TraderService } from '../../../../app/appstate/trader.service';
import { PayoutService } from '../payouts/payouts.service';
import { GetTraderResBody,GetCryptoResBody } from '../../../../app/services/auth.type';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Trader } from '../../../../app/appstate/appstate-model';
import { selectTrader, selectTraderLoading, selectTraderError } from '../../../../app/appstate/trader.selectors';
import { CryptoService } from '../../../../app/pages/myaccount/crypto/crypto.service';
import { Router, RouterModule } from '@angular/router';
import { InvestmentService } from '../../../../app/pages/myaccount/invest/investment.service';
import { AuthService } from '../../../../app/services/auth.service';
import { SharedService } from '../../../../app/shared/shared.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';


@Component({
  selector: 'app-payouts',

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
  templateUrl: './payouts.component.html',
  styleUrl: './payouts.component.scss',
})
export class PayoutsComponent implements OnInit {

    walletBalance: string = '0.00';
    amountInvested: string = '0.00';
    profit: string = '0.00';
    userRevenue: string = '';
    walletAddress: string = '';
    userProfit: string = '';
    imageSecureUrl: string = '';
    errorMessage: string = '';
    trader$: Observable<Trader | null>;
    loading$: Observable<boolean>;
    error$: Observable<any>;

senderEmail: string = '';
transactionType: string;
amount: number = 0;
senderName: string = '';
description: string = '';
transReference: string = '';
is_request_payouts: boolean = false;
id: string = '';
address: string = '';
currency: string = '';
amount_withdrawn: number = 0;
batch_withdrawal_id: string = '';
ipn_callback_url: string = '';
status: string = '';
extra_id: string = '';
hash: string = '';
error: string = '';
payout_description: string = '';
unique_external_id: string = '';
created_at: string = '';
requestedAt: string = '';
updatedAt: string = '';
    entityName: string ;
    isSuperAdmin: boolean ;
    isTradersDashBoardType: boolean ;
    isAdminDashBoardType: boolean ;
    isNormalEntityType: boolean ;
    isSuperEntityType: boolean ;
  
    loading: boolean = false;
 
    resumeData={
      tradeStatus:"",
      description: '',
    };
    
  
    constructor(private store: Store, private payoutsService:PayoutService, private traderService: TraderService,private authService:AuthService, private cryptoService: CryptoService, private investService:InvestmentService, private router: Router) {
      this.trader$ = this.store.select(selectTrader);
      this.loading$ = this.store.select(selectTraderLoading);
      this.error$ = this.store.select(selectTraderError);
    }
  
    private htmlElement!: HTMLHtmlElement;
    private sharedService = inject(SharedService);
    ngOnInit(): void {
      this.getPayoutTransactions();
      this.updatePagedList();
      this.getCurrentTrader();
       
    }
  
    payoutTransactionList: any[] = [];
pagedPayoutList: any[] = [];
currentPage = 1;
pageSize = 6;

payoutDescription:string;
payoutStatus:boolean;



getCurrentTrader(){
  this.traderService.getTrader().subscribe({
    next: (res: GetTraderResBody) => {
      this.payoutStatus = res.data.payoutStatus;
      this.payoutDescription = res.data.payoutDescription;
      this.entityName = res.data.entityName;
      this.isSuperAdmin = res.data.isSuperAdmin;
    }});
  }


getPayoutTransactions() {
this.payoutsService.getPayoutTransactions().subscribe({
      next: (res: any[]) => {
        this.payoutTransactionList = res.map(item => ({
          senderEmail: item.senderEmail,
          transactionType: item.transactionType,
          amount: item.amount,
          senderName: item.senderName,
          description: item.description,
          transReference: item.transReference,
          is_request_payouts: item.is_request_payouts,
          id: item.id,
          address: item.address,
          currency: item.currency,
          amount_withdrawn: item.amount_withdrawn,
          batch_withdrawal_id: item.batch_withdrawal_id,
          ipn_callback_url: item.ipn_callback_url,
          status: item.status,
          payout_status: item.payout_status,
          extra_id: item.extra_id,
          hash: item.hash,
          error: item.error,
          payout_description: item.payout_description,
          unique_external_id: item.unique_external_id,
          created_at: item.created_at,
          requestedAt: item.requestedAt,
          updatedAt: item.updatedAt
        }))
          
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
        this.updatePagedList();
      },
      error: (err) => {}
    });
  }
  
        
        
        updatePagedList() {
          const startIndex = (this.currentPage - 1) * this.pageSize;
          const endIndex = startIndex + this.pageSize;
          this.pagedPayoutList = this.payoutTransactionList.slice(startIndex, endIndex);
        }
        
        changePage(page: any) {
          if (page < 1 || page > this.totalPages.length) return;
          this.currentPage = page;
          this.updatePagedList();
        }
        
        get totalPages(): any[] {
          return Array(Math.ceil(this.payoutTransactionList.length / this.pageSize)).fill(0).map((_, i) => i + 1);
        }
        // end of available cryptos
        



        displayedColumns1: string[] = [
            'senderName',
            'amount',
            'amount_withdrawn',
            'address',
            'currency',
            'transactionId',
            'created_at',
            'payout_status',
            'errorState',
            'batch_withdrawal_id',
            'payoutId'
          ];

        displayedColumnsUsers: string[] = [
            'senderName',
            'amount',
            'address',
            'currency',
            'payout_status',
            'created_at',
            'payoutId'
          ];
          


          
onResumeTrade(){
    const { tradeStatus,description} = this.resumeData;
    this.loading = true;
    if (!tradeStatus) {
      this.errorMessage = 'Please Select Trade Status.';
      this.loading = false;
      return;
    }
    this.payoutsService.resumeTrade(
     description,
      tradeStatus,
    ).subscribe({
      next: (response) => {
        this.sharedService.showToast({
          title: `Withdrawal has been successfully update.`,
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


