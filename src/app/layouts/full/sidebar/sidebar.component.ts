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
import { TranslateModule } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';


@Component({
  selector: 'app-sidebar',
  imports: [BrandingComponent, TablerIconsModule, MaterialModule, RouterModule,CommonModule],
  templateUrl:'./sidebar.component.html',
})
export class SidebarComponent implements OnInit {
   constructor(private traderService: TraderService,private logoutService: LogoutService,public router: Router,) {}
      firstName: string;
      entityName: string ;
      lastName: string;
      isSuperAdmin: boolean ;
      isSuperAdminType: boolean ;
      isNormalEntityType: boolean ;
      isNormalAdminType: boolean ;
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
                
  
        },
        error: (err) => {}
      });
    }



    onLogout(){
      this.logoutService.logout();
    }
}
