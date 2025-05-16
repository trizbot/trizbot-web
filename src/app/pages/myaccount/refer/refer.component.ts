import { Component, OnInit } from '@angular/core';
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
import { GetTraderResBody,GetDownlinesResBody } from '../../../../app/services/auth.type';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-refer',
  templateUrl: './refer.component.html',
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
})
export class ReferComponent implements OnInit {
    referralLink: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private investService: InvestmentService,
    private traderService: TraderService,
    private snackBar: MatSnackBar
  ) {}


  errorMessage: string = '';
  loading: boolean = false;
  cryptoId: string;
  traderId: string;

  displayedColumns1: string[] = ['image', 'userName','referralCode', 'uplinerBonusAmount',  'createdAt'];
  completedReferralList: any[] = [];
  pagedReferralList: any[] = [];
  currentReferralPage = 1;
  pageReferralSize = 40;

  ngOnInit(): void {
    this.getDownlines();
    this.updateReferalPagedList();
  }


 
  getDownlines() {
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.traderId = res.data._id;
        // this.referralLink = `https://www.trizbot.com/auth/register?ref=${res.data.referralLink}`;
        this.referralLink = `${res.data.referralLink}`;
  
        this.traderService.getDownlines(res.data.referralLink).subscribe({
          next: (res: any) => {
            const rawData = res.data || [];
  
            this.completedReferralList = rawData.map((item: any) => ({
              firstName: item.firstName,
              lastName: item.lastName,
              approvalStatus: item.approvalStatus,
              userName: item.userName,
              entityName: item.entityName,
              email: item.email,
              phoneNumber: item.phoneNumber,
              walletBalance: item.walletBalance,
              walletAddress: item.walletAddress,
              amountInvested: item.amountInvested,
              referralCode: item.referralLink,
              profit: item.profit,
              createdAt: item.createdAt,
              uplinerBonusAmount: item.uplinerBonusAmount??0,
              imageSecureUrl: item.imageSecureUrl || null, // fallback if missing
            }));
  
            this.updateReferalPagedList();
          },
          error: (err) => {
          },
        });
      },
      error: (err) => {
      },
    });
  }
  
  updateReferalPagedList() {
    const startIndex = (this.currentReferralPage - 1) * this.pageReferralSize;
    const endIndex = startIndex + this.pageReferralSize;
    this.pagedReferralList = this.completedReferralList.slice(startIndex, endIndex);
  }

  changeCompletedReferralPage(page: any) {
    if (page < 1 || page > this.totalReferralPages.length) return;
    this.currentReferralPage = page;
    this.updateReferalPagedList();
  }

  get totalReferralPages(): any[] {
    return Array(Math.ceil(this.completedReferralList.length / this.pageReferralSize)).fill(0).map((_, i) => i + 1);
  }




  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Referral Link copied!', 'Close', {
        duration: 2000
      });
    });
  }
}
