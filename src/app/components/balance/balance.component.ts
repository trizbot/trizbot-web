import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../material.module';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TablerIconsModule } from 'angular-tabler-icons';

import { interval, Subscription } from 'rxjs';
import { TraderService } from '../../../app/appstate/trader.service';
import { GetTraderResBody,GetCryptoResBody,GetWeeklyStatisticsResBody } from '../../../app/services/auth.type';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Trader } from '../../../app/appstate/appstate-model';
import { selectTrader, selectTraderLoading, selectTraderError } from '../../../app/appstate/trader.selectors';
import { CryptoService } from '../../../app/pages/myaccount/crypto/crypto.service';
import { Router, RouterModule } from '@angular/router';
import { InvestmentService } from '../../../app/pages/myaccount/invest/investment.service';
import { AuthService } from '../../../app/services/auth.service';


@Component({
  selector: 'app-sales-overview',

  standalone: true,
  imports: [MaterialModule, TablerIconsModule, CommonModule,RouterModule, NgApexchartsModule],
  templateUrl: './balance.component.html',
  styleUrl: './balance.component.scss',
})
export class WalletBalanceComponent implements OnInit {
  walletBalance: string = '0.00';
  amountInvested: string = '0.00';
  profit: string = '0.00';
  depositBalance: string = '0.00';
  userRevenue: string = '';
  lastName: string = '';
  phoneNumber: string = '';
  walletAddress: string = '';
  userProfit: string = '';
  imageSecureUrl: string = '';
  errorMessage: string = '';
  trader$: Observable<Trader | null>;
  loading$: Observable<boolean>;
  error$: Observable<any>;


  totalUsers: string;
    totalActiveUsers: string;
    totalWeeklyFunds: string;
    totalWeeklyProfits: string;


  entityName: string ;
  isSuperAdmin: boolean ;
  isCryptoAvailableStatus: boolean;
  payoutStatus: boolean;
  isCryptoAvailableDescription: string;
  isTradersDashBoardType: boolean ;
  isAdminDashBoardType: boolean ;
  isNormalEntityType: boolean ;
  isSuperEntityType: boolean ;

  countdowns: { [key: string]: string } = {}; // Track countdown per trade
  private timerSub: Subscription;

  constructor(private store: Store,private traderService: TraderService,private authService:AuthService, private cryptoService: CryptoService, private investService:InvestmentService, private router: Router) {
    this.trader$ = this.store.select(selectTrader);
    this.loading$ = this.store.select(selectTraderLoading);
    this.error$ = this.store.select(selectTraderError);
  }


  ngOnInit(): void {
    this.getCurrentTrader();
    this.getAvailableCryptos();
    this.updatePagedList();
    this.updateInvestPagedList();
    this.updateCompletedInvestPagedList();
    this.getInvestments();
    this.getCompletedInvestments();
    this.getWeeklyStatistics();
    this.startCountdown();
    
  }


  
  
getWeeklyStatistics(){
this.traderService.getAllTraders({ page: 1, limit: 100001 }).subscribe({
  next: (res: any) => {
 
    res.data.forEach((trader: any) => {
      this.totalWeeklyProfits += trader.profit || 0;
      this.totalWeeklyFunds += trader.depositBalance || 0;

      if ((trader.walletBalance || 0) > 1) {
        this.totalActiveUsers += 1;
      }
    });
  },
  error: () => {}
});




    this.traderService.getWeeklyStatistics().subscribe({
      next:(res:GetWeeklyStatisticsResBody)=>{
    this.totalUsers= res.data.totalUsers;
    // this.totalActiveUsers = res.data.totalActiveUsers;
    // this.totalWeeklyFunds=res.data.totalWeeklyFunds;
    // this.totalWeeklyProfits=res.data.totalWeeklyProfits;
      }
    })
    
  }
  

  getCurrentTrader(){
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.phoneNumber = res.data.phoneNumber;
        this.walletBalance = res.data.walletBalance;
        this.amountInvested = res.data.amountInvested;
        this.walletAddress = res.data.walletAddress;
        this.depositBalance = res.data.depositBalance;
        this.isCryptoAvailableStatus = res.data.isCryptoAvailableStatus;
        this.isCryptoAvailableDescription = res.data.isCryptoAvailableDescription;
        this.payoutStatus = res.data.payoutStatus;
    
        this.profit = res.data.profit;
        this.userRevenue =res.data.firstName;
        this.lastName = res.data.lastName;
        this.imageSecureUrl = res.data.imageSecureUrl;
        this.entityName = res.data.entityName;
        this.isSuperAdmin = res.data.isSuperAdmin;
   

        if (this.entityName=="Admin"  &&this.isSuperAdmin) {
          this.isSuperEntityType=true;
          this.isAdminDashBoardType=true;
          this.isTradersDashBoardType=false;
       } else  if (this.entityName=="Admin"  && !this.isSuperAdmin) {
          this.isSuperEntityType=false;
          this.isAdminDashBoardType=true;
          this.isTradersDashBoardType=false;
          }
          else if (this.entityName=="Trader" &&this.isSuperAdmin) {
          this.isNormalEntityType=false;
          this.isAdminDashBoardType=true;
          this.isTradersDashBoardType=false;
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
pageSize = 1000;
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
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        })).sort((a:any, b:any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        

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



onSetupTrade(id: string) {
  this.selectedCryptoId = id;
  const encodedId = btoa(id); 
  this.router.navigate(['/myaccount/invest', encodedId]);
}

// end of available crypto services
// ###############################################################







// ###############################################################
  // get running trades
  investmentList: any[] = [];
  pagedInvestmentList: any[] = [];
  currentInvestPage = 1;
  pageInvestSize = 30;
  selectedInvestId: string = ''; 
  runningOperation: boolean = false;
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
            investmentStatus: item.investmentStatus,
            transactionStatus: item.transactionStatus,
            imageUrl: item.imageUrl,
            cryptoId: item.cryptoId,
            cryptoName: item.cryptoName,
            description: item.description,
            traderId: item.traderId,
            traderName: item.traderName,
            profit: item.profit,
            expiry: item.expiry,
            operationStatus: item.operationStatus,
            createdAt: item.createdAt,
            updatedAt:item.updatedAt
          };
  
          if (item.operationStatus === true  &&item.transactionType=="Debit" && item.transactionStatus=="Pending") {
            this.runningOperation = true;
          }else{
            this.runningOperation=false;
          }

          return investmentItem;
        }).sort((a:any, b:any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
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
  // end of running trades
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
            updatedAt: item.updatedAt,
            createdAt: item.createdAt
          };
  
  
          return completedInvestmentItem;
        }).sort((a:any, b:any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
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
  






// count down 



startCountdown() {
  this.timerSub = interval(1000).subscribe(() => {
    const now = new Date().getTime();

    this.pagedInvestmentList.forEach(invest => {
      const expiryTime = new Date(invest.expiry).getTime();
      const remaining = expiryTime - now;

      if (remaining > 0) {
        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remaining / (1000 * 60)) % 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        this.countdowns[invest.expiry] = `${this.pad(hours)}h ${this.pad(minutes)}m ${this.pad(seconds)}s`;
      } else {
      
        if (invest.transactionStatus !== 'Expired') {
          invest.transactionStatus = invest.investmentStatus;
      
          // auto-revert-funds 
    this.investService.autoRevertFunds().subscribe({
      next: (res: any) => {
        this.countdowns[invest.expiry] = '00h 00m 00s';
      }
    }
  );
  // end of counter
        }
      }
    });
  });
}

pad(num: number): string {
  return num < 10 ? '0' + num : num.toString();
}





ngOnDestroy() {
  if (this.timerSub) {
    this.timerSub.unsubscribe();
  }
}
}
