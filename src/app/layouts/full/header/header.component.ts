import {
  Component,OnInit,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';


import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody,GetNotificationResBody } from '../../../../app/services/auth.type';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Trader } from '../../../../app/appstate/appstate-model';
import { selectTrader, selectTraderLoading, selectTraderError } from '../../../../app/appstate/trader.selectors';
import { LogoutService } from '../../../../app/auth/logout/logout.service';


@Component({
  selector: 'app-header',
  imports: [
    RouterModule,
    CommonModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit {
  @Input() showToggle = true;
  @Input() toggleChecked = false;


  @Output() toggleMobileNav = new EventEmitter<void>();

    constructor(private store: Store,private traderService: TraderService, private logoutService:LogoutService) {
      this.trader$ = this.store.select(selectTrader);
      this.loading$ = this.store.select(selectTraderLoading);
      this.error$ = this.store.select(selectTraderError);
    }
  

    walletBalance: string = '0.00';
    amountInvested: string = '0.00';
    profit: string = '0.00';
    firstName: string;
    showNotificationTitle: string;
    showNotificationText: string;
    showNotificationId: string;
    isShowingNotification: boolean= false;
    authStatus: string;
    phoneNumber: string;
    walletAddress: string ;
    entityName: string ;
    imageSecureUrl: string ;
    lastName: string;
    notificationTitle: string;
    notificationId: any;
    notificationText: string;
    countNotification: any;
    isSuperAdmin: boolean ;
    isNormalEntityType: boolean ;
    isSuperEntityType: boolean ;
    errorMessage: string = '';
    trader$: Observable<Trader | null>;
    loading$: Observable<boolean>;
    error$: Observable<any>;


  ngOnInit(): void {
    this.getCurrentTraders();
    this.getNotifications();
    this.countNotifications();
      
  }

  getCurrentTraders(){
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.phoneNumber = res.data.phoneNumber;
        this.walletBalance = res.data.walletBalance;
        this.amountInvested = res.data.amountInvested;
        this.walletAddress = res.data.walletAddress;
        this.profit = res.data.profit;
        this.firstName =res.data. firstName;
        this.entityName =res.data. entityName;
        this.lastName = res.data.lastName;
        this.authStatus = res.data.approvalStatus;
        this.isSuperAdmin = res.data.isSuperAdmin;
        this.imageSecureUrl = res.data.imageSecureUrl;

        if (this.entityName=="Admin"  &&this.isSuperAdmin) {
        this.isNormalEntityType=true;
        }
       else  if (this.entityName=="Admin"  && !this.isSuperAdmin) {
        this.isNormalEntityType=true;
        }
        else if (this.entityName=="Trader" &&this.isSuperAdmin) {
        this.isSuperEntityType=true;
        }
        else if (this.entityName=="Trader" &&!this.isSuperAdmin) {
        this.isSuperEntityType=false;
        }
        else{
          this.isNormalEntityType =false;
        }


      },
      error: (err) => {}
    });
  }
  onLogout(){
    this.logoutService.logout();
  }



  notifications: any[] = []; // declare at the top of your component

  getNotifications() {
    this.traderService.getNotification().subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res.data)) {
          this.notifications = res.data;
        } else {
          this.notifications = [];
        }
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load notifications.';
      }
    });
  }
  
  
  
  
  
  countNotifications() {
    this.traderService.countNotification().subscribe({
      next: (res) => {
        this.countNotification = res;
        return res;
      },
      error: (err) => {  }
    });
  }
  

  
  onShowFullText(text: string, title:string, id:string){
        this.showNotificationTitle =title;
   this.showNotificationText=  text;
   this.showNotificationId=  id;
   this.isShowingNotification = true;

  }
  

  onMarkAsRead(id: string){
        this.traderService.readNotification(id).subscribe({
      next: (res) => {
        this.isShowingNotification = false;
        this.getNotifications();
       return res;
  
      },
      error: (err) => {  }
    });

  }

  
}