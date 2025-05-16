import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { MaterialModule } from 'src/app/material.module';
import { CoreService } from '../../services/core.service';
import { SharedService } from '../../shared/shared.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-otp',
  standalone: true,
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './confirm-otp.component.html',
  styleUrls: ['./confirm-otp.component.scss'],
})
export class ConfirmOtpComponent {
  hidePassword: boolean = true;

  validEmailData={
  verificationCode:'',
};

errorMessage: any = '';
successMessage: any = '';
validEmailAddress: any = '';
loading: boolean = false;
loadingCode: boolean = false;
emailVerified = false;
codeSent = false;
verificationCode = '';
referralName:string;
private unsubscriber$ = new Subject<void>();
private sharedService = inject(SharedService);
referralCode: any="";
constructor(
private authService: AuthService,
private router: Router,private route: ActivatedRoute
){}

ngOnInit(): void {
  this.route.queryParams.subscribe(params => {
  const encodedReferral = params['referralCode'];
  const onceDecoded = encodedReferral ? decodeURIComponent(encodedReferral) : '';
  this.referralCode = decodeURIComponent(onceDecoded);
  this.authService.confirmReferralCode(this.referralCode).pipe(takeUntil(this.unsubscriber$)).subscribe({
  next: (res) => { 
    console.log(res);
  // this.referralName= res?.referralName; //
  },
  error: (err) => {
  this.errorMessage = err?.error.message||err?.error?.message || ' code.';
  },
  });
  });
}

verifyCode() { 
  this.loading=true;
  this.route.queryParams.subscribe(params => {
  const encodedEmail = params['email'];
  this.validEmailAddress = encodedEmail ? decodeURIComponent(encodedEmail) : '';
});


  this.authService.confirmVerificationCode(this.validEmailData.verificationCode).pipe(takeUntil(this.unsubscriber$)).subscribe({
    next: (response) => {
    this.emailVerified = true;
    this.successMessage = 'Email verified. Continue signup.';
    this.errorMessage = "";
    this.loading=false;
    
        this.router.navigate(['auth/register'], {
        queryParams: { email: encodeURIComponent(this.validEmailAddress) }
        });
},
error: (err) => {
    this.emailVerified = false;
    this.loading=false;
    this.successMessage = "";
    this.errorMessage = err?.error.message|| err?.error?.message || 'Invalid verification code.';
}
});

}

}
