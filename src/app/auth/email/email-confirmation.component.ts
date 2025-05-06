import { Component, inject } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { CommonModule } from '@angular/common';
import { SharedService } from '../../shared/shared.service';


@Component({
  selector: 'app-side-email-confirmation',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule,CommonModule],
  templateUrl: './email-confirmation.component.html',
  styleUrl: './email-confirmation.component.scss',
})
export class EmailConfirmationComponent {
  emailConfirmationData = {otp:""}
  errorMessage: string="";
  loading:any = false;
  hidePassword: boolean = true;
  hideConfirmPassword: boolean = true;
  private sharedService = inject(SharedService);
  constructor(private authService:AuthService,  private router: Router) {}

  onCompleteEmailVerification(){
  this.errorMessage ="";
  this.loading = true;
  const {otp} = this.emailConfirmationData;
  this.authService.completeEmailVerification(otp).subscribe({
    next:(response)=>{
      this.sharedService.showToast({
        title: 'Account Created successfully. Please login'
      });
      this. loading= false;

      this.router.navigate(['/auth/login']);
    },
    error:(err)=>{
      this. loading= false;
    this.errorMessage = err.errors?.message||"Unable Verify OTP. Please try again";

    }
  }); 
}






}
