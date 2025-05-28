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
selector: 'app-history',
  standalone: true,
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

  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
  errorMessage: string = '';
  loading: boolean = false;
  cryptoId: string;

  displayedColumns1: string[] = ['image', 'amount', 'transactionStatus', 'PrevBalance','Profit', 'createdAt'];
  completedInvestmentList: any[] = [];
  pagedCompletedInvestmentList: any[] = [];
  currentCompletedInvestPage = 1;
  pageCompletedInvestSize = 40;

  constructor(
    private route: ActivatedRoute,
    private investService: InvestmentService
  ) {}

  ngOnInit(): void {
    this.getInvestmentHistory();
    this.updateCompletedInvestPagedList();
  }
  
getInvestmentHistory() {
    this.investService.getInvestmentHistory().subscribe({
      next: (res: any) => {
        this.completedInvestmentList = res.data
          .map((item: any) => {
            const completedInvestmentItem = {
              amount: item.amount,
              traderEmail: item.traderEmail,
              curBalance: item.curBalance,
              prevBalance: item.prevBalance,
              transactionType: item.transactionType,
              transactionStatus: item.investmentStatus,
              imageUrl: item.imageUrl,
              cryptoId: item.cryptoId,
              cryptoName: item.cryptoName,
              description: item.description,
              traderId: item.traderId,
              traderName: item.traderName,
              profit: item.profit,
              expiry: item.expiry,
              createdAt: item.createdAt,
              id: item.id
            };
            return completedInvestmentItem;
          })
          // Sort by createdAt descending (most recent first)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
        this.updateCompletedInvestPagedList();
      },
      error: (err) => {
        // Handle error
      }
    });
  }
  updateCompletedInvestPagedList() {
    const startIndex = (this.currentCompletedInvestPage - 1) * this.pageCompletedInvestSize;
    const endIndex = startIndex + this.pageCompletedInvestSize;
    this.pagedCompletedInvestmentList = this.completedInvestmentList.slice(startIndex, endIndex);
  }

  changeCompletedInvestPage(page: any) {
    if (page < 1 || page > this.totalCompletedInvestPages.length) return;
    this.currentCompletedInvestPage = page;
    this.updateCompletedInvestPagedList();
  }

  get totalCompletedInvestPages(): any[] {
    return Array(Math.ceil(this.completedInvestmentList.length / this.pageCompletedInvestSize)).fill(0).map((_, i) => i + 1);
  }
}
