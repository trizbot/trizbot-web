import { Component, inject, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { AuthService } from '../../../services/auth.service';
import { CryptoService } from '../crypto/crypto.service';
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
import { GetTraderResBody, GetAllTradersResBody } from '../../../../app/services/auth.type';

@Component({
  selector: 'app-users',
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
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  private sharedService = inject(SharedService);

  errorMessage: string = '';
  selectedCryptoId: string = ''; 
  loading: boolean = false;
  constructor(
    private settings: CoreService,
    private cryptoService: CryptoService,
    private traderService: TraderService,
    private router: Router
  ) {}

  displayedColumns1: string[] = ['id','ImageUrl','userName', 'phoneNumber', 'email',  'CurBalance', 'Profit','FirstName', 'LastName', 'createdAt'];
  completedInvestmentList: any[] = [];
  pagedCompletedInvestmentList: any[] = [];
  currentCompletedInvestPage = 1;
  pageCompletedInvestSize = 40;

  ngOnInit(): void {
    this.getUsers();
    this.updateCompletedInvestPagedList();
  }

  getUsers() {
    this.traderService.getAllTraders().subscribe({
      next: (res: any) => {
        this.completedInvestmentList = res.data.map((item: any) => ({
          imageUrl: item.imageSecureUrl,
          _id: item._id,
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
          profit: item.profit,
          createdAt: item.createdAt
        }));
        this.updateCompletedInvestPagedList();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load users.';
      }
    });
  }

  updateCompletedInvestPagedList() {
    const startIndex = (this.currentCompletedInvestPage - 1) * this.pageCompletedInvestSize;
    const endIndex = startIndex + this.pageCompletedInvestSize;
    this.pagedCompletedInvestmentList = this.completedInvestmentList.slice(startIndex, endIndex);
  }

  changeCompletedInvestPage(page: number) {
    if (page < 1 || page > this.totalCompletedInvestPages.length) return;
    this.currentCompletedInvestPage = page;
    this.updateCompletedInvestPagedList();
  }

  get totalCompletedInvestPages(): number[] {
    return Array(Math.ceil(this.completedInvestmentList.length / this.pageCompletedInvestSize)).fill(0).map((_, i) => i + 1);
  }




  onSetupReview(id: string){
    this.selectedCryptoId = id;
    const encodedId = btoa(id); 
    this.router.navigate(['/myaccount/review', encodedId]);

  }


}
