import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { BrandingComponent } from './branding.component';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from '../../../../app/material.module';

import { TraderService } from '../../../../app/appstate/trader.service';
import { GetTraderResBody } from '../../../../app/services/auth.type';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Trader } from '../../../../app/appstate/appstate-model';
import { selectTrader, selectTraderLoading, selectTraderError } from '../../../../app/appstate/trader.selectors';
import { LogoutService } from '../../../../app/auth/logout/logout.service';



@Component({
  selector: 'app-sidebar',
  imports: [BrandingComponent, TablerIconsModule, MaterialModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
   constructor(private traderService: TraderService,private logoutService: LogoutService) {}
      firstName: string;
      entityName: string ;
      lastName: string;
      isSuperAdmin: boolean ;
      isNormalEntityType: boolean ;
      isSuperEntityType: boolean ;
      
  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  ngOnInit(): void {
      this.traderService.getTrader().subscribe({
        next: (res: GetTraderResBody) => {
        
          this.firstName =res.data.firstName;
          this.entityName =res.data.entityName;
          this.lastName = res.data.lastName;
          this.isSuperAdmin = res.data.isSuperAdmin;
          localStorage.setItem('entityName', res.data.entityName);

          if (this.entityName=="Admin"  &&this.isSuperAdmin) {
          localStorage.setItem('entityName', 'Admin');
          localStorage.setItem('isSuperAdminType', 'true');
          localStorage.setItem('isNormalAdminType', 'false');

          }
         else  if (this.entityName=="Admin"  && !this.isSuperAdmin) {
          localStorage.setItem('entityName', 'Admin');
          localStorage.setItem('isSuperAdminType', 'false');
          localStorage.setItem('isNormalAdminType', 'true');

          }
          else if (this.entityName=="Trader" &&this.isSuperAdmin) {
            localStorage.setItem('entityName', 'Trader');
            localStorage.setItem('isSuperAdminType', 'true');
            localStorage.setItem('isNormalAdminType', 'false');
            
          }
          else if (this.entityName=="Trader" &&!this.isSuperAdmin) {
          
          localStorage.setItem('entityName', 'Trader');
          localStorage.setItem('isSuperAdminType', 'false');
          localStorage.setItem('isNormalAdminType', 'false');

          }
          else{
          
            localStorage.setItem('entityName', 'Trader');
            localStorage.setItem('isSuperAdminType', 'false');
            localStorage.setItem('isNormalAdminType', 'false');

          }
  
  
        },
        error: (err) => {}
      });
    }



    onLogout(){
      this.logoutService.logout();
    }
}
