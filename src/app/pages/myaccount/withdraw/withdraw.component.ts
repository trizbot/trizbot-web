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
  templateUrl: './withdraw.component.html',
})
export class WithdrawComponent implements OnInit {
  
      private htmlElement!: HTMLHtmlElement;
      private sharedService = inject(SharedService);
  
  
    errorMessage: string = '';
    loading: boolean = false;
    traderId: string;
    email: string;
    isNormalEntityType: boolean = false;
    payoutStatus: boolean;
    payoutDescription: string;
    
    entityName: string;
    entity: string;
  
  
    withdrawData = {
      amount: '',
      transactionPin: '',
      
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
        this.email = res.data.email;
        this.payoutStatus = res.data.payoutStatus;
        this.payoutDescription = res.data.payoutDescription;
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
 
  onCreateWithdraw(){
      this.errorMessage = '';
      this.loading= true;
      const timestamp = Date.now(); 
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase(); 
      const reference = `IRV${timestamp}${randomStr}`;
      
      const { amount,transactionPin} = this.withdrawData;
      
   
      if (!transactionPin) {
        this.errorMessage = 'Please enter a reasons.';
        this.loading = false;
        return;
      }
   
      if (!amount) {
        this.errorMessage = 'Please enter amount.';
        this.loading = false;
        return;
      }
    
      this.traderService.withdraw(
         amount,
        reference,
        this.entityName,
        transactionPin,
        this.email,
        this.entity
      ).subscribe({
        next: (response) => {
          this.sharedService.showToast({
            title: `Withdraw request is successfully created.`,
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

