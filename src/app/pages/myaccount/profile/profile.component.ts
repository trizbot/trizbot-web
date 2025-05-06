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
  selector: 'app-profile',
  templateUrl: './profile.component.html',
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
export class ProfileComponent implements OnInit {
  
  private htmlElement!: HTMLHtmlElement;
  private sharedService = inject(SharedService);
  hidePassword: boolean = true;
  hideConfirmPassword: boolean = true;
  errorMessage: string = '';
  errorPinMessage: string = '';
  errorAvatarMessage: string = '';
  loading: boolean = false;
  loadingPin: boolean = false;
  loadingAvatar: boolean = false;
  isNormalEntityType: boolean = false;
  traderId: string;
  entityName: string;
  address: any;
  phoneNumber: any;
  entity: string;
  imageUrl: string;


  profileData = {
    phoneNumber: '',
    address: '',
  };

  
  pinData = {
    transactionPin: '',
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
        this.phoneNumber =res.data.phoneNumber;
        this.address =res.data.address;
        this.traderId = res.data._id;
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



  onCreateTransactionPin(): void {
    this.errorPinMessage = '';
    this.loadingPin = true;
  
    const { transactionPin} = this.pinData;
    const traderId = this.traderId;
 
    if (!transactionPin) {
      this.errorPinMessage = 'Please enter a transaction pin.';
      this.loadingPin = false;
      return;
    }
  
    this.traderService.setTransaction(
      parseInt(transactionPin),
      traderId,
      this.entity,
    ).subscribe({
      next: (response) => {
        this.sharedService.showToast({
          title: `Transaction Pin has been successfully set.`,
        });
        this.loadingPin = false;
      },
      error: (err) => {
        const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
        this.errorPinMessage = message;
        this.loadingPin = false;
      },
    });
  }
  

  onCreateProfile(){
  this.errorMessage = '';
  this.loading = true;

  const { address, phoneNumber } = this.profileData;
  const traderId = this.traderId;

  if (!phoneNumber) {
    this.errorMessage = 'Please enter a valid phone number.';
    this.loading = false;
    return;
  }
  if (!address) {
    this.errorMessage = 'Please enter a valid residential address.';
    this.loading = false;
    return;
  }

  this.traderService.updateTraders(
    address,
    phoneNumber,
    this.entity,
  ).subscribe({
    next: (response) => {
      this.sharedService.showToast({
        title: `Profile has been updated successfully .`,
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




// avatar
files: File[] = []; 
onSelect(event: any) {
  this.files.push(...event.addedFiles);
}

onRemove(event:any){
  this.files.splice(this.files.indexOf(event),1);
}




onCreateUploadAvatar(){
  this.errorAvatarMessage = '';
    this.loadingAvatar = true;
  
    if (!this.files || !this.files.length) {
      this.errorAvatarMessage = 'Please select a file to upload.';
      this.loadingAvatar = false;
      return;
    }
  
    const file_data = this.files[0];
    const uploadData = new FormData();
    uploadData.append('file', file_data);
    uploadData.append('upload_preset', 'trizbot');
    uploadData.append('folder', 'cryptos');

    this.traderService.generateImage(uploadData).subscribe({
      next: (uploadResponse: any) => {
        const imageSecureUrl = uploadResponse.secure_url;
        const imageAssetId = uploadResponse.asset_id;
        const imagePublicId = uploadResponse.public_id;
        const imageUrl = uploadResponse.url;

        this.traderService.updateAvatar(
          imageUrl,
          imageSecureUrl,
          imageAssetId,
          imagePublicId,
          this.entity,
        ).subscribe({
          next: (response) => {
            this.sharedService.showToast({
              title: `Profile Avatar Updated successfully`,
            });
            this.loadingAvatar = false;
          },
          error: (err) => {
            const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
            this.errorAvatarMessage = message;
            this.loadingAvatar = false;
          },
        });
      },
      error: (uploadError) => {
        this.errorAvatarMessage = 'Image upload failed. Please try again.';
        this.loadingAvatar = false;
      },
    });

      
      

}


}