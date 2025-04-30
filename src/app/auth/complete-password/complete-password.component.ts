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
  selector: 'app-side-complete-password',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule,CommonModule],
  templateUrl: './complete-password.component.html',
  styleUrl: './complete-password.component.scss',
})
export class CompletePasswordComponent {
  completeForgotData = {otp:"", newPassword:""}
  errorMessage: string="";
  loading:any = false;
  hidePassword: boolean = true;
  hideConfirmPassword: boolean = true;
  private sharedService = inject(SharedService);
  constructor(private authService:AuthService,  private router: Router) {}

  onCompletePassword(){
  this.errorMessage ="";
  this.loading = true;
  const {otp, newPassword} = this.completeForgotData;
  this.authService.completePassword(otp,newPassword).subscribe({
    next:(response)=>{
      this.sharedService.showToast({
        title: 'Password Changed successfully. Please login'
      });
      this. loading= false;

      this.router.navigate(['/auth/login']);
    },
    error:(err)=>{
      this. loading= false;
    this.errorMessage = err.errors?.message||"Unable complete forgot failed. Please try again";

    }
  }); 
}






}
