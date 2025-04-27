import { Component, inject } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
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


@Component({
  selector: 'app-admin',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule,CommonModule,
      MatFormFieldModule,
      MatSelectModule,
      FormsModule,
      ReactiveFormsModule,
      MatRadioModule,
      MatButtonModule,
      MatCardModule,
      MatInputModule,
      MatCheckboxModule,
    ],

  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {

    private htmlElement!: HTMLHtmlElement;
    private sharedService = inject(SharedService);
  
    options = this.settings.getOptions();
  
    constructor(private settings: CoreService, private authService:AuthService,  private router: Router) {
    this.htmlElement = document.querySelector('html')!;

  }
  adminData = {email:"",password:"",firstName:"",lastName:"",phoneNumber: "",userName:""}
  errorMessage: string="";
  loading:any = false;

  onCreateAdmin(){
    this.errorMessage ="";
    this.loading=true;
    const {email,password,firstName,lastName,phoneNumber,userName} = this.adminData;
    this.authService.createAdmin(email,password,firstName,lastName,phoneNumber,userName).subscribe({
      next:(response)=>{
        

        this.sharedService.showToast({
          title: firstName+' Administrator Account is created successfully'
        });

        this.loading=false;
      },
      error: (err) => {
        const message = err?.error.message|| err?.error?.message || 'An unexpected error occurred.';
        this.errorMessage = message;
        this.loading = false;
      },
    }); 
  }

}