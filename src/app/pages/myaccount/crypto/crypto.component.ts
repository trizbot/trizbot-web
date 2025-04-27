import { Component, inject, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { AuthService } from '../../../services/auth.service';
import { CryptoService } from '../crypto/crypto.service';
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

@Component({
  selector: 'app-crypto',
  standalone: true,
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
  templateUrl: './crypto.component.html',
  styleUrls: ['./crypto.component.scss'],
})
export class CryptoComponent implements OnInit {
  private htmlElement!: HTMLHtmlElement;
  private sharedService = inject(SharedService);

  creatorName: string = '';

   cryptoData = {
    maxAmount: '9000000000000000000',
    minAmount: '',
    title: '',
    creatorName: '',
    percentage: '',
    expiry: '',
    sellExchange: '',
    buyExchange: '',
  };
  

  errorMessage: string = '';
  loading: boolean = false;
  imageUrl: string;


  percentageOptions: number[] = Array.from({ length: 100 }, (_, i) => i + 1);
  expiryOptions: number[] = Array.from({ length: 100 }, (_, i) => i + 1);


  constructor(
    private settings: CoreService,
    private cryptoService: CryptoService,
    private traderService: TraderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.htmlElement = document.querySelector('html')!;
    this.traderService.getTrader().subscribe({
      next: (res: GetTraderResBody) => {
        this.creatorName = `${res.data.firstName} ${res.data.lastName}`;
        this.cryptoData.creatorName = this.creatorName;
      },
    });
  }

  files: File[] = []; 
  onSelect(event: any) {
    this.files.push(...event.addedFiles);
  }

  onRemove(event:any){
    this.files.splice(this.files.indexOf(event),1);
  }
  onCreateCrypto() {
    this.errorMessage = '';
    this.loading = true;
  
    if (!this.files || !this.files.length) {
      this.errorMessage = 'Please select a file to upload.';
      this.loading = false;
      return;
    }
  
    const file_data = this.files[0];
    const uploadData = new FormData();
    uploadData.append('file', file_data);
    uploadData.append('upload_preset', 'trizbot');
  
    const { creatorName, title, maxAmount, minAmount, percentage,expiry,sellExchange,buyExchange } = this.cryptoData;
  
    this.cryptoService.uploadImage(uploadData).subscribe({
      next: (uploadResponse: any) => {
        const imageSecureUrl = uploadResponse.secure_url;
        const imageAssetId = uploadResponse.asset_id;
        const imagePublicId = uploadResponse.public_id;
        const imageUrl = uploadResponse.url;

        
  
        this.cryptoService.createCrypto(
          creatorName,
          title,
          maxAmount,
          minAmount,
          imageUrl,
          imageSecureUrl,
          imageAssetId,
          imagePublicId,
          percentage,
          expiry,
          sellExchange,
          buyExchange,
        ).subscribe({
          next: (response) => {
            this.sharedService.showToast({
              title: `${title} crypto is created successfully`,
            });
            this.loading = false;
          },
          error: (err) => {
            const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
            this.errorMessage = message;
            this.loading = false;
          },
        });
      },
      error: (uploadError) => {
        this.errorMessage = 'Image upload failed. Please try again.';
        this.loading = false;
      },
    });
  }
  
  

}
