import { Component, inject, OnInit } from '@angular/core';
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
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-password',
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
  templateUrl: './change-password.component.html',
})

export class ChangePasswordComponent implements OnInit {
  
  private htmlElement!: HTMLHtmlElement;
  private sharedService = inject(SharedService);
  hidePassword: boolean = true;
  hideConfirmPassword: boolean = true;
  errorMessage: string = '';
  errorPassMessage: string = '';
  loading: boolean = false;
  loadingPass: boolean = false;
  loadingAvatar: boolean = false;
  isNormalEntityType: boolean = false;
  traderId: string;
  entityName: string;
  entity: string;
  imageUrl: string;
  email: any;


  passwordData = {
    otp: '',
    newPassword: '',
  };
  
  

  constructor(
    private route: ActivatedRoute,
    private investService: InvestmentService,
    private traderService: TraderService,
    private authService: AuthService,
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


  onRequest(){
    this.errorMessage ="";
    this.loading=true;
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.entityName =res.data.entityName;
        this.traderId = res.data._id;
        this.email = res.data.email;

    this.authService.forgotPassword(this.email).subscribe({
      next:(response)=>{
        this.sharedService.showToast({
          title: `A password Reset OTP has been sent to your registered email, use it to complete your password reset.`,
        });
        this.loading = false;
      },
      error:(err)=>{
        const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
        this.errorMessage = message;
      this.loading=false;
      }
    }); 

  }
}); 
  }






   

  
    onCompletePassword(){
    this.errorPassMessage ="";
    this.loadingPass = true;
    const {otp, newPassword} = this.passwordData;
    this.authService.completePassword(otp,newPassword).subscribe({
      next:(response)=>{
        this.sharedService.showToast({
          title: 'Password Changed successfully.'
        });
        this. loadingPass= false;
      },
      error:(err)=>{
        this. loadingPass= false;
         this.errorPassMessage  = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
  
      }
    }); 
  
  }
}