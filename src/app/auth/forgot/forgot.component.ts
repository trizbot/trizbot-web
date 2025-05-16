import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../../app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../app/services/auth.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-side-forgot',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule,CommonModule],
  templateUrl: './forgot.component.html',
  styleUrl: './forgot.component.scss',
})
export class ForgotComponent {
  forgotData = {email:""}
  errorMessage: string="";
  loading:any = false;
  
  constructor(private authService:AuthService,  private router: Router) {}

onForgot(){
  this.errorMessage ="";
  this.loading=true;
  const {email} = this.forgotData;
  this.authService.forgotPassword(email).subscribe({
    next:(response)=>{
      this.router.navigate(['/auth/complete']);
      this.loading=false;
    },
    error:(err)=>{
    this.errorMessage = err.errors?.message|| err.errors?.message||"forgot failed. Please try again";
    this.loading=false;
    }
  }); 
}






}
