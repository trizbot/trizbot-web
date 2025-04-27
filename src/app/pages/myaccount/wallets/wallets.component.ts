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
  selector: 'app-wallets',
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
  templateUrl: './wallets.component.html',
})

 
export class WalletComponent implements OnInit {


  
  private htmlElement!: HTMLHtmlElement;
  private sharedService = inject(SharedService);

  errorMessage: string = '';
  errorPinMessage: string = '';
  errorWalletMessage: string = '';
  loading: boolean = false;
  loadingPin: boolean = false;
  loadingWallet: boolean = false;
  isNormalEntityType: boolean = false;
  traderId: string;
  entityName: string;
  entity: string;
  imageUrl: string;
  availableWalletAddress: string;

  currencies: string[] = [
    "btg", "eth", "xmr", "zec", "xvg", "ada", "ltc", "bch", "qtum", "dash",
    "xlm", "xrp", "xem", "dgb", "lsk", "doge", "trx", "kmd", "rep", "bat",
    "ark", "waves", "bnb", "xzc", "nano", "tusd", "vet", "zen", "grs", "fun",
    "neo", "gas", "pax", "usdc", "ont", "xtz", "link", "rvn", "bnbmainnet",
    "zil", "bcd", "usdt", "usdterc20", "cro", "dai", "ht", "wabi", "busd",
    "algo", "usdttrc20", "gt", "stpt", "ava", "sxp", "uni", "okb", "btc"
  ];
  
  walletData = {
    walletAddress: '',
    walletCurrency:"",
    addressNetwork:"",
    addressTags:""
  };
  constructor(
    private route: ActivatedRoute,
    private investService: InvestmentService,
    private traderService: TraderService,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.getCurrentTrader();
    
  }

  getCurrentTrader(){
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.entityName =res.data.entityName;
        this.traderId = res.data._id;
        this.availableWalletAddress = res.data.walletAddress;
        if (this.entityName=="Admin") {
          this.isNormalEntityType=true;
          this.entity='admins';
          }
          else if (this.entityName=="Trader") {
          this.isNormalEntityType=true;
          this.entity='traders';
          } else{
            this.isNormalEntityType =false;
            this.entity='traders';
          }
          
      },
      error: (err) => {
        this.errorMessage = '';
      }
    });

  }

  onCreateWalletAddress(){
    this.errorWalletMessage = '';
    this.loadingWallet = true;
  
    const { walletAddress,addressNetwork,walletCurrency,addressTags} = this.walletData;
    const traderId = this.traderId;
 
    if (!walletAddress) {
      this.errorWalletMessage = 'Please enter a crypto wallet address';
      this.loadingWallet= false;
      return;
    }
  
    this.traderService.walletAddress(
      walletAddress,addressNetwork,walletCurrency,addressTags,
      this.entity,
    ).subscribe({
      next: (response) => {
        this.sharedService.showToast({
          title: `Crypto Wallet has been successfully Added.`,
        });
        this.loadingWallet = false;
      },
      error: (err) => {
        const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
        this.errorWalletMessage = message;
        this.loadingWallet = false;
      },
    });
  }

  

}
