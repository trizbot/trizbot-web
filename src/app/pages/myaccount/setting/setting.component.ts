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

   usdtBscDepositAmount: any;
      usdtPolygonDepositAmount: any;
      usdtBscPayoutAmount: any;
      usdtPolygonPayoutAmount: any;
       minimumDepositAmount: any;
      minimumPayoutAmount: any;

    settingData = {
      usdtBscDepositAmount: 0,
      usdtPolygonDepositAmount: 0,
      usdtBscPayoutAmount: 0,
      usdtPolygonPayoutAmount: 0,
       minimumDepositAmount: 0,
      minimumPayoutAmount: 0,
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

  getCharges(){
    this.settingService.getCharges().subscribe({
      next: (res: GetChargeResBody) => {
        this.usdtBscDepositAmount =res.data.usdtBscDepositAmount;
        this.minimumDepositAmount =res.data.minimumDepositAmount;
        this.minimumPayoutAmount =res.data.minimumPayoutAmount;
        this.usdtPolygonDepositAmount =res.data.usdtPolygonDepositAmount;
        this.usdtPolygonDepositAmount =res.data.usdtPolygonDepositAmount; 
        this.usdtBscPayoutAmount =res.data.usdtBscPayoutAmount;
      },
      error: (err) => {
        this.errorMessage = '';
      }
    });

  }




  onCreateSetting(){
      this.errorMessage = '';
      this.loading= true;
     const {usdtBscDepositAmount,usdtPolygonDepositAmount, usdtBscPayoutAmount,usdtPolygonPayoutAmount,minimumDepositAmount,minimumPayoutAmount} = this.settingData;  
      this.settingService.createSetting(usdtBscDepositAmount,usdtPolygonDepositAmount, usdtBscPayoutAmount,usdtPolygonPayoutAmount, minimumDepositAmount,
            minimumPayoutAmount).subscribe({
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

