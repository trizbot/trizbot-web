
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
import { GetTraderResBody,GetDownlinesResBody } from '../../../../app/services/auth.type';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './chat.component.html',
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
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  ngOnInit() {
    this.loadTawkTo();
  }

  loadTawkTo() {
    const s1 = document.createElement('script');
    s1.src='https://embed.tawk.to/68136afdbe6663190a6c5c56/1iq5tjs5u';
    s1.async = true;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    document.head.appendChild(s1);
  }
}


