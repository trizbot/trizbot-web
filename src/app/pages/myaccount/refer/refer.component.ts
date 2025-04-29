import { Component, OnInit } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-refer',
  templateUrl: './refer.component.html',
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
})
export class ReferComponent implements OnInit {
  referral: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private investService: InvestmentService,
    private traderService: TraderService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.getCurrentTrader();
  }

  getCurrentTrader(): void {
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.referral = res.data.entityName;
      },
      error: (err) => {
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Referral Link copied!', 'Close', {
        duration: 2000
      });
    });
  }
}
