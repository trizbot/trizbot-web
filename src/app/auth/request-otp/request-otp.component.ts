import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { MaterialModule } from 'src/app/material.module';
import { CoreService } from '../../../app/services/core.service';
import { SharedService } from '../../shared/shared.service';
import { AuthService } from '../../../app/services/auth.service';

@Component({
  selector: 'app-request-otp',
  standalone: true,
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './request-otp.component.html',
  styleUrls: ['./request-otp.component.scss'],
})
export class RequestOtpComponent {
  
  requestOtpData={
  email:'',
};

  errorMessage: any = '';
  successMessage: any = '';
  validEmailAddress: any = '';
  loading: boolean = false;
  loadingCode: boolean = false;

  emailVerified = false;
codeSent = false;
verificationCode = '';


  private unsubscriber$ = new Subject<void>();
  private sharedService = inject(SharedService);
  // referralCode: any="";

  constructor(
    private authService: AuthService,
    private router: Router,private route: ActivatedRoute
  ) {}


requestVerificationCode() {
  this.loadingCode= true;
  if (!this.requestOtpData.email) {
    this.errorMessage = 'Please enter your email first.';
    this.loadingCode= false;
    return;
  }

this.authService.requestVerificationCode(this.requestOtpData.email).pipe(takeUntil(this.unsubscriber$)).subscribe({
  next: (response) => {
    this.codeSent = true;
    this.errorMessage = '';
    this.successMessage = 'Verification code sent to your email.';
    this.loadingCode= false;
    this.router.navigate(['auth/confirm-otp'], {
        queryParams: { email: encodeURIComponent(this.requestOtpData.email) }
        });

  },
  error: (err) => {
    this.successMessage = "";
    this.codeSent = false;
    this.loadingCode= false;
    this.errorMessage =
    err?.error.message|| err?.error?.message ||  'Email verification failed. Please try again';
  }
});
  // TODO: Call backend to send code

}

}
