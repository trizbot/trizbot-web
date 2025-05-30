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
import { TraderService } from '../../../appstate/trader.service';
import { GetChargeResBody, GetTraderResBody } from '../../../services/auth.type';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InvestmentService } from '../invest/investment.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { SettingService } from './setting.service';




@Component({
  selector: 'app-setting',
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
  templateUrl: './setting.component.html',
})
export class SettingComponent implements OnInit {
  
      private htmlElement!: HTMLHtmlElement;
      private sharedService = inject(SharedService);
  
  
    errorMessage: string = '';
    loading: boolean = false;

   usdtBscDepositAmount: string;
      usdtPolygonDepositAmount: string;
      usdtBscPayoutAmount: string;
      usdtPolygonPayoutAmount: any;
       minimumDepositAmount: string;
      minimumPayoutAmount: string;
      minimumTradeAmount: string;

      settingList: any[] = [];
    settingData = {
      usdtBscDepositAmount: 0,
      usdtPolygonDepositAmount: 0,
      usdtBscPayoutAmount: 0,
      usdtPolygonPayoutAmount: 0,
       minimumDepositAmount: 0,
      minimumPayoutAmount: 0,
      minimumTradeAmount: 0,
    };
    constructor(
      private route: ActivatedRoute,
      private investService: InvestmentService,
      private settingService: SettingService,
      private router: Router
    ) {}
  

  ngOnInit(): void {
    this.getCharges();
  }

getCharges() {
  this.settingService.getCharges().subscribe({
    next: (res: any) => {
      this.settingList = res.data
        .map((item: any) => {
          this.usdtBscDepositAmount = item.usdtBscDepositAmount;
          this.minimumDepositAmount = item.minimumDepositAmount;
          this.minimumPayoutAmount = item.minimumPayoutAmount;
          this.usdtPolygonDepositAmount = item.usdtPolygonDepositAmount;
          this.usdtBscPayoutAmount = item.usdtBscPayoutAmount;
          this.minimumTradeAmount = item.minimumTradeAmount;

          const completedInvestmentItem = {
            id: item.id,
            createdAt: item.createdAt // Required for sorting
          };
          return completedInvestmentItem;
        })
        // Sort by createdAt descending (most recent first)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    error: (err) => {}
  });
}




  onCreateSetting(){
      this.errorMessage = '';
      this.loading= true;
     const {usdtBscDepositAmount,usdtPolygonDepositAmount, usdtBscPayoutAmount,usdtPolygonPayoutAmount,minimumDepositAmount,minimumPayoutAmount,minimumTradeAmount} = this.settingData;  
      this.settingService.createSetting(usdtBscDepositAmount,usdtPolygonDepositAmount, usdtBscPayoutAmount,usdtPolygonPayoutAmount, minimumDepositAmount,
            minimumPayoutAmount,minimumTradeAmount).subscribe({
        next: (response) => {
             this.sharedService.showToast({
            title: `Price Setting successfully created.`,
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

