import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MaterialModule } from 'src/app/material.module';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CoreService } from '../../../services/core.service';
import { SharedService } from '../../../shared/shared.service';
import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InvestmentService } from '../invest/investment.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';




@Component({
  selector: 'app-deposit',
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
  templateUrl: './notification.component.html',
})
export class SendnotificationComponent implements OnInit {
  
      private htmlElement!: HTMLHtmlElement;
      private sharedService = inject(SharedService);
  
  
    errorMessage: string = '';
    loading: boolean = false;
 
  
    entityName: string;
    entity: string;
  
    
    notificationData = {
      text: '',
      title: '',
    };
    constructor(
      private route: ActivatedRoute,
      private investService: InvestmentService,
      private traderService: TraderService,
      private router: Router
    ) {}
  
ngOnInit(): void {}

 
  onSendNotification(){
      this.errorMessage = '';
      this.loading= true;
      const timestamp = Date.now(); 
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase(); 
      const reference = `IRV${timestamp}${randomStr}`;
      
      const { text,title} = this.notificationData;
      
   
      if (!text) {
        this.errorMessage = 'Please enter a reasons.';
        this.loading = false;
        return;
      }
      if (!title) {
        this.errorMessage = 'Please enter title.';
        this.loading = false;
        return;
      }
  
      this.traderService.sendNotification(
        text, title,
        this.entity
      ).subscribe({
        next: (response) => {
          this.sharedService.showToast({
            title: `Notification  is sent successfully.`,
          });
          this.loading = false;
        },
        error: (err) => {
          const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
          this.errorMessage = message;
          this.loading = false;
        },
      });
    }
  }  

