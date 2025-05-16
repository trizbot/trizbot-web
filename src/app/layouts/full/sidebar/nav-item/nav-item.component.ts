import {
  Component,
  HostBinding,
  Input,
  OnChanges,
  OnInit,
  Output,
  EventEmitter,
} from '@angular/core';
import { NavItem } from './nav-item';
import { NavService } from '../../../../services/nav.service';
import { TranslateModule } from '@ngx-translate/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TraderService } from '../../../../../app/appstate/trader.service';
import { GetTraderResBody,GetCryptoResBody } from '../../../../../app/services/auth.type';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Trader } from '../../../../../app/appstate/appstate-model';
import { selectTrader, selectTraderLoading, selectTraderError } from '../../../../../app/appstate/trader.selectors';
import { CryptoService } from '../../../../../app/pages/myaccount/crypto/crypto.service';
import { Router, RouterModule } from '@angular/router';
import { InvestmentService } from '../../../../../app/pages/myaccount/invest/investment.service';
import { AuthService } from '../../../../../app/services/auth.service';
import { LogoutService } from '../../../../../app/auth/logout/logout.service';

@Component({
  selector: 'app-nav-item',
  imports: [TranslateModule, TablerIconsModule, MaterialModule, CommonModule],
  templateUrl: './nav-item.component.html',
  styleUrls: [],
})
export class AppNavItemComponent implements OnChanges,OnInit{
  @Output() notify: EventEmitter<boolean> = new EventEmitter<boolean>();

  @Input() item: NavItem | any;

  expanded: any = false;





  @HostBinding('attr.aria-expanded') ariaExpanded = this.expanded;
  @Input() depth: any;
 
    constructor(private logoutService:LogoutService, public navService: NavService, public router: Router, private store: Store,private traderService: TraderService,private authService:AuthService, private cryptoService: CryptoService, private investService:InvestmentService) {}
  

  ngOnChanges() {
    const url = this.navService.currentUrl();
    if (this.item.route && url) {
      this.expanded = url.indexOf(`/${this.item.route}`) === 0;
      this.ariaExpanded = this.expanded;
    }
  }

  onItemSelected(item: NavItem) {
    if (!item.children || !item.children.length) {
      this.router.navigate([item.route]);
    }
    if (item.children && item.children.length) {
      this.expanded = !this.expanded;
    }
    //scroll
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
    if (!this.expanded) {
      if (window.innerWidth < 1024) {
        this.notify.emit();
      }
    }
  }

  openExternalLink(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  onSubItemSelected(item: NavItem) {
    if (!item.children || !item.children.length) {
      if (this.expanded && window.innerWidth < 1024) {
        this.notify.emit();
      }
    }
  }

  ngOnInit(): void {
    const threst = 688;
}

  
onLogout(){
  this.logoutService.logout();
}

}
