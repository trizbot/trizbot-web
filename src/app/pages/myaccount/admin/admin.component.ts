import { Component, inject, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
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
  selector: 'app-admin',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule,CommonModule,
      MatFormFieldModule,
      MatSelectModule,
      FormsModule,
      ReactiveFormsModule,
      MatRadioModule,
      MatButtonModule,
      MatCardModule,
      MatInputModule,
      MatCheckboxModule,
    ],

  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {

    private htmlElement!: HTMLHtmlElement;
    private sharedService = inject(SharedService);
    
  
    options = this.settings.getOptions();
  
    constructor(private settings: CoreService, private authService:AuthService,  private router: Router, 
      private traderService: TraderService) {
    this.htmlElement = document.querySelector('html')!;

  }
  adminData = {email:"",password:"",firstName:"",lastName:"",phoneNumber: "",userName:""}
  errorMessage: string="";
  loading:any = false;
  selectedCryptoId: string = ''; 
  hidePassword: boolean = true;
  hideConfirmPassword: boolean = true;

  ngOnInit(): void {
    this.getUsers();
    this.updateCompletedInvestPagedList();
  }


  displayedColumns1: string[] = ['id','ImageUrl','userName', 'phoneNumber', 'email', 'FirstName', 'LastName', 'createdAt'];
  completedInvestmentList: any[] = [];
  pagedCompletedInvestmentList: any[] = [];
  currentCompletedInvestPage = 1;
  pageCompletedInvestSize = 40;


  getUsers() {
    this.traderService.getAllAdmins().subscribe({
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


  onCreateAdmin(){
    this.errorMessage ="";
    this.loading=true;
    const {email,password,firstName,lastName,phoneNumber,userName} = this.adminData;
    this.authService.createAdmin(email,password,firstName,lastName,phoneNumber,userName).subscribe({
      next:(response)=>{
        

        this.sharedService.showToast({
          title: firstName+' Administrator Account is created successfully'
        });

        this.loading=false;
      },
      error: (err) => {
        const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
        this.errorMessage = message;
        this.loading = false;
      },
    }); 
  }












  onRemove(id: string): void {
    this.selectedCryptoId = id;
    // const encodedId = btoa(id);
    this.loading = true;
  
    this.traderService.removeAdmin(id).subscribe({
      next: () => {
        this.sharedService.showToast({
          title: 'Administrator account was deleted successfully.',
        });
        this.loading = false;
      },
      error: (err) => {
        const message = err?.error?.message || 'An unexpected error occurred.';
        this.errorMessage = message;
        this.loading = false;
      }
    });
  }
  


  
}