import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../../app/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../app/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-login',
  standalone: true,
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginData = { email: '', password: '' };
  errorMessage: string = '';
  loading = false;
  hidePassword: boolean = true;
  hideConfirmPassword: boolean = true;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.errorMessage = '';
    this.loading = true;
    const { email, password } = this.loginData;

    this.authService.getEntity(email).subscribe({
        next: (response) => {
          this.authService.signInTrader(email,password,response.body?.entityName).subscribe({
            next: (response) => {
          this.router.navigate(['/dashboard']);
          this.loading = false;
            }

          });
      
      },

      error:(err)=>{
        const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
        this.errorMessage = message;
      this.loading=false;
      }

      ,
    });
  }
}
