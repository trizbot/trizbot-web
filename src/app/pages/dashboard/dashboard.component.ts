import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MaterialModule } from '../../material.module';
import { WalletBalanceComponent } from '../../components/balance/balance.component';
import { AppDailyActivitiesComponent } from '../../components/recent-transactions/recent-transactions.component';
// import { AppProductPerformanceComponent } from '../../../app/components/product-performance/product-performance.component';
import { AuthService } from '../../../app/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-starter',
  imports: [
    MaterialModule,
    WalletBalanceComponent,
    // AppDailyActivitiesComponent,
    // AppProductPerformanceComponent,
    
  ],
  templateUrl: './dashboard.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class DashboardComponent { 
}