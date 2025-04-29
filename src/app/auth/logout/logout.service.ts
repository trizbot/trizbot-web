// auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class LogoutService {
  constructor(private router: Router) {}
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('entityName');
    localStorage.removeItem('token');
    localStorage.removeItem('isSuperAdminType');
    localStorage.removeItem('isNormalAdminType');
    localStorage.clear(); 
    this.router.navigate(['/auth/login']); 
  }

}
