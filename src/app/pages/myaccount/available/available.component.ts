import { Component, inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../material.module';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TablerIconsModule } from 'angular-tabler-icons';


import { TraderService } from '../../../../app/appstate/trader.service';
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
  selector: 'app-available',

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
  templateUrl: './available.component.html',
  styleUrl: './available.component.scss',
})
export class AvailableComponent implements OnInit {
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
  

  constructor(private store: Store,private traderService: TraderService,private authService:AuthService, private cryptoService: CryptoService, private investService:InvestmentService, private router: Router) {
    this.trader$ = this.store.select(selectTrader);
    this.loading$ = this.store.select(selectTraderLoading);
    this.error$ = this.store.select(selectTraderError);
  }

  private htmlElement!: HTMLHtmlElement;
  private sharedService = inject(SharedService);
  ngOnInit(): void {
    this.getCurrentTrader();
    this.getAvailableCryptos();
    this.updatePagedList();
    this.updateInvestPagedList();
    this.updateCompletedInvestPagedList();
    this.getInvestments();
    this.getCompletedInvestments();
    
  }


  
  getCurrentTrader(){
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.userProfit = res.data.phoneNumber;
        this.walletBalance = res.data.walletBalance;
        this.amountInvested = res.data.amountInvested;
        this.walletAddress = res.data.walletAddress;
        this.profit = res.data.profit;
        this.userRevenue =res.data.firstName;
        this.userProfit = res.data.lastName;
        this.imageSecureUrl = res.data.imageSecureUrl;
        this.entityName = res.data.entityName;

        if (this.entityName=="Admin"  &&this.isSuperAdmin) {
          this.isSuperEntityType=true;
          this.isAdminDashBoardType=true;
          this.isTradersDashBoardType=false;

          }
         else  if (this.entityName=="Admin"  && !this.isSuperAdmin) {
          this.isSuperEntityType=false;
          this.isAdminDashBoardType=true;
          this.isTradersDashBoardType=false;
          }
          else if (this.entityName=="Trader" &&this.isSuperAdmin) {
          this.isNormalEntityType=true;
          this.isAdminDashBoardType=false;
          this.isTradersDashBoardType=true;
          }
          else if (this.entityName=="Trader" &&!this.isSuperAdmin) {
          this.isNormalEntityType=false;
          this.isAdminDashBoardType=false;
          this.isTradersDashBoardType=true;
          }
          else{
            this.isNormalEntityType =false;
            this.isAdminDashBoardType=false;
            this.isTradersDashBoardType=true;
          }
  
      },
      error: (err) => {
        this.errorMessage = '';
      }
    });

  }


  // get available cryptos
// ###############################################################
availableCryptoList: any[] = [];
pagedCryptoList: any[] = [];
currentPage = 1;
pageSize = 6;
selectedCryptoId: string = ''; 

getAvailableCryptos() {
  this.cryptoService.getAvailableCryptos().subscribe({
    next: (res: any[]) => {
      this.availableCryptoList = res
        .filter(item => item.operationStatus === true) // only include items with true operationStatus
        .map(item => ({
          title: item.title,
          minAmount: item.minAmount,
          profit: item.profit,
          id: item._id,
          category: item.category,
          operationStatus: item.operationStatus,
          imageUrl: item.imageSecureUrl,
          expiry: item.expiry,
          percentage: item.percentage,
          buyExchange: item.buyExchange,
          sellExchange: item.sellExchange,
          tradeStatus: item.tradeStatus,
          status: item.status,
          description: item.description,
          createdAt: item.createdAt
        }));

      this.updatePagedList();
    },
    error: (err) => {}
  });
}



updatePagedList() {
  const startIndex = (this.currentPage - 1) * this.pageSize;
  const endIndex = startIndex + this.pageSize;
  this.pagedCryptoList = this.availableCryptoList.slice(startIndex, endIndex);
}

changePage(page: any) {
  if (page < 1 || page > this.totalPages.length) return;
  this.currentPage = page;
  this.updatePagedList();
}

get totalPages(): any[] {
  return Array(Math.ceil(this.availableCryptoList.length / this.pageSize)).fill(0).map((_, i) => i + 1);
}
// end of available cryptos








// ###############################################################
  // get available investments
  investmentList: any[] = [];
  pagedInvestmentList: any[] = [];
  currentInvestPage = 1;
  pageInvestSize = 6;
  selectedInvestId: string = ''; 
  getInvestments() {
    this.investService.getInvestments().subscribe({
      next: (res: any) => {
        this.investmentList = res.data.map((item: any) => {

          const investmentItem = {
            amount: item.amount,
            traderEmail: item.traderEmail,
            curBalance: item.curBalance,
            prevBalance: item.prevBalance,
            transactionType: item.transactionType,
            transactionStatus: item.investmentStatus,
            imageUrl: item.imageUrl,
            cryptoId: item.cryptoId,
            cryptoName: item.cryptoName,
            description: item.description,
            traderId: item.traderId,
            traderName: item.traderName,
            profit: item.profit,
            expiry: item.expiry,
            createdAt: item.createdAt
          };
  
  
          return investmentItem;
        });
  
        this.updateInvestPagedList();
      },
      error: (err) => {
      }
    });
  }
    
   
  updateInvestPagedList() {
    const startIndex = (this.currentInvestPage - 1) * this.pageInvestSize;
    const endIndex = startIndex + this.pageInvestSize;
    this.pagedInvestmentList = this.investmentList.slice(startIndex, endIndex);
  }
  
  changeInvestPage(page: any) {
    if (page < 1 || page > this.totalInvestPages.length) return;
    this.currentInvestPage = page;
    this.updateInvestPagedList();
  }
  
  get totalInvestPages(): any[] {
    return Array(Math.ceil(this.investmentList.length / this.pageInvestSize)).fill(0).map((_, i) => i + 1);
  }
  // end of investement cryptos
  // ###############################################################
  
  

  

// ###############################################################
  // get completed investments
  completedInvestmentList: any[] = [];
  pagedCompletedInvestmentList: any[] = [];
  currentCompletedInvestPage = 1;
  pageCompletedInvestSize = 6;
  selectedCompletedInvestId: string = ''; 
  getCompletedInvestments() {
    this.investService.getCompletedInvestments().subscribe({
      next: (res: any) => {
        this.completedInvestmentList = res.data.map((item: any) => {

          const completedInvestmentItem = {
            amount: item.amount,
            traderEmail: item.traderEmail,
            curBalance: item.curBalance,
            prevBalance: item.prevBalance,
            transactionType: item.transactionType,
            transactionStatus: item.investmentStatus,
            imageUrl: item.imageUrl,
            cryptoId: item.cryptoId,
            cryptoName: item.cryptoName,
            description: item.description,
            traderId: item.traderId,
            traderName: item.traderName,
            profit: item.profit,
            expiry: item.expiry,
            createdAt: item.createdAt
          };
  
  
          return completedInvestmentItem;
        });
  
        this.updateCompletedInvestPagedList();
      },
      error: (err) => {
      }
    });
  }
    
   
  updateCompletedInvestPagedList() {
    const startIndex = (this.currentCompletedInvestPage - 1) * this.pageCompletedInvestSize;
    const endIndex = startIndex + this.pageCompletedInvestSize;
    this.pagedCompletedInvestmentList = this.completedInvestmentList.slice(startIndex, endIndex);
  }
  
  changeCompletedInvestPage(page: any) {
    if (page < 1 || page > this.totalCompletedInvestPages.length) return;
    this.currentCompletedInvestPage = page;
    this.updateCompletedInvestPagedList();
  }
  
  get totalCompletedInvestPages(): any[] {
    return Array(Math.ceil(this.completedInvestmentList.length / this.pageCompletedInvestSize)).fill(0).map((_, i) => i + 1);
  }
  // end of  Completed investement cryptos
// ###############################################################  
  





onRemoveTrade(id: string) {
  this.selectedCryptoId = id;
  const encodedId = btoa(id); 
  this.loading = true;
  this.cryptoService.removeTrade(encodedId).subscribe({
    next: (response) => {
      this.sharedService.showToast({
        title: `Crypto Trades has been successfully deleted.`,
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



onResumeTrade(){
const { tradeStatus,description} = this.resumeData;
this.loading = true;
if (!tradeStatus) {
  this.errorMessage = 'Please Select Trade Status.';
  this.loading = false;
  return;
}
this.cryptoService.resumeTrade(
 description,
  tradeStatus,
).subscribe({
  next: (response) => {
    this.sharedService.showToast({
      title: `Available Crypto Trades has been successfully update.`,
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

