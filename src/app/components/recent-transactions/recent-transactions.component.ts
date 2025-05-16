import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from '../../../app/material.module';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface transactions {
  id: number;
  iconColor: string;
  icon: string;
  title: string;
  subtitle: string;
  amount: string;
  status: string;
}

@Component({
    selector: 'app-daily-activities',
    
    imports: [RouterModule,TablerIconsModule, MaterialModule, FormsModule, ReactiveFormsModule,CommonModule],
    templateUrl: './recent-transactions.component.html',
})

export class AppDailyActivitiesComponent {
    transactions: transactions[] = [
        {
          id: 1,
          iconColor: 'secondary',
          icon: 'currency-dollar',
          title: 'PayPal Transfer',
          subtitle: 'Money Added',
          amount: '+$350',
          status: 'success',
        },
        {
          id: 2,
          iconColor: 'success',
          icon: 'shield',
          title: 'Wallet',
          subtitle: 'Bill Payment',
          amount: '-$560',
          status: 'error',
        },
        {
          id: 3,
          iconColor: 'error',
          icon: 'credit-card',
          title: 'Credit Card',
          subtitle: 'Money reversed',
          amount: '+$350',
          status: 'success',
        },
        {
          id: 4,
          iconColor: 'warning',
          icon: 'check',
          title: 'Bank Transfer',
          subtitle: 'Money Added',
          amount: '+$350',
          status: 'success',
        },
      ];
}
