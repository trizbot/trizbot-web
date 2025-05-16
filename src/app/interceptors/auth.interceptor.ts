import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { LogoutService } from '../auth/logout/logout.service';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000); // in seconds
    return payload.exp && payload.exp < currentTime;
  } catch (e) {
    return true; // Treat invalid token as expired
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const logoutService = inject(LogoutService);
  const router = inject(Router);
  const authToken = authService.getToken();

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
      if (( error.status === 403||error.status==401) && authToken && isTokenExpired(authToken)) {
        logoutService.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
