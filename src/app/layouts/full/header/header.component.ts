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

  getNotifications() {
    this.traderService.getNotification().subscribe({
      next: (res: GetNotificationResBody) => {
        if (res?.data) {
          this.notificationTitle = res.data.title || '';
          this.notificationText = res.data.text || '';
          this.notificationId = res.data._id || '';
        } else {
          this.notificationTitle = 'No Title';
          this.notificationText = 'No notification text available.';
        }
      },
      error: (err) => {  }
    });
  }
  
  countNotifications() {
    this.traderService.countNotification().subscribe({
      next: (res) => {
        this.countNotification = res;
      },
      error: (err) => {  }
    });
  }
  

  
  onMarkAsRead(id: string){
        this.traderService.readNotification(id).subscribe({
      next: (res) => {
        this.countNotification = res;
      },
      error: (err) => {  }
    });

  }

  
}