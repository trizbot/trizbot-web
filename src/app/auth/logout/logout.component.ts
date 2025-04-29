
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../../app/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../app/services/auth.service';
import { LogoutService } from '../logout/logout.service';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss',
  
})
export class LogoutComponent  {
    constructor(private logoutService: LogoutService) {}

    onLogout() {
      this.logoutService.logout();
    }
}
