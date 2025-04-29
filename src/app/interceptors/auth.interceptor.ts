import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { LogoutService } from '../auth/logout/logout.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const logoutService = inject(LogoutService);
  const router = inject(Router);
  const authToken = authService.getToken();

  // Bypass interceptor for Cloudinary upload requests
  if (req.url.includes('https://api.cloudinary.com')) {
    return next(req);
  }

  
  const authReq = authToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status === 401 || error.status === 403) {
        logoutService.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
