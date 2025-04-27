import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { BehaviorSubject, catchError, exhaustMap, of, switchMap, take, tap, throwError } from 'rxjs';
import { SharedService } from '../shared/shared.service';
import { AuthResBody, GetTraderResBody, AuthEntityResBody,SigninDto } from './auth.type';
import { Trader } from '../trader/models/trader.model';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
    private timerRef: any;
    readonly sharedService = inject(SharedService);

    
  baseUrl = `${environment.apiBaseUrl}traders/`;
  admin$ = new BehaviorSubject<Trader | null>(null);
  currentAdmin?: Trader | null;

  isAdmin: boolean = false;

  
  constructor(private http: HttpClient, private router: Router) {}

  signUpTraders(email: string,password: string,firstName: string,address: string,lastName: string,phoneNumber: string,password_confirmation: string,country: string,entityName: string,userName: string){
  const payload = {email,password, firstName,   address, lastName,  phoneNumber,password_confirmation, country, entityName, userName};

  if(entityName=="Trader"){
    return this.http.post(`${environment.apiBaseUrl}/traders`, payload);
  }else{
    const payload = {email, password, name: {first: firstName,last: lastName}, phoneNumber};
    return this.http.post(`${environment.apiBaseUrl}/admins`, payload);
  }

  }


    getEntity(email: string) {
      const payload = { email };
      return this.http.post<AuthEntityResBody>(`${environment.apiBaseUrl}/traders/getEntity`, payload, {
        observe: 'response'
      });
    }
    
      signInTrader(email: string, password: string, entityName:any) {
      const body = { email, password };
          const entity = entityName === 'Trader' ? 'traders' : 'admins';
          this.setEntity(entity);
                      
          return this.http.post<AuthResBody>(`${environment.apiBaseUrl}/${entity}/auth`, body, {
            observe: 'response',
          }).pipe(
            take(1),
            switchMap((authResponse) => {
              if (authResponse.body) {
                return this.handleGetTraders(authResponse.body,entityName);
              }
              return this.http.post<AuthResBody>(`${environment.apiBaseUrl}/${entity}/auth`, body, {
                observe: 'response',
              }).pipe(
                take(1),
                switchMap((fallbackResponse) => this.handleGetTraders(fallbackResponse.body!,entityName))
              );
            })
          );
  
    }
    
  handleGetTraders(res: AuthResBody,entityName:any) {
    if (!res?.data?.authToken) {
      return of(null); 
    }

    this.setToken(res.data.authToken);
       const entity = entityName === 'Trader' ? 'traders' : 'admins';
       this.setEntity(entity);

    return this.http.get<GetTraderResBody>(`${environment.apiBaseUrl}/${entity}/me`);

    
  }
  





autoSignin() {
  const adminData = localStorage.getItem('token');
  if (!adminData) return;

  const parsedAdmin = JSON.parse(adminData);

  const admin = Trader.fromJson(parsedAdmin);
  if (!admin.token) return;

  this.admin$.next(admin);
  this.currentAdmin = admin;

  this.autoSignout(new Date(parsedAdmin.authTokenExpirationDate));
}







autoSignout(tokenExpDate: Date) {
  const remainingTime = tokenExpDate.getTime() - new Date().getTime();
  this.timerRef = setTimeout(() => {
    this.sharedService.showToast({
      title: 'Login Expired!',
      text: "You're being signed out. Login again to continue.",
      background: '#ffd67e',
      timerProgressBar: true,
    });
    setTimeout(() => {
      this.signout();
    }, 5000);
  }, remainingTime);
}

signout() {
  this.router.navigate(['/auth/login']);

  this.admin$.next(null);
  this.currentAdmin = null;

  localStorage.removeItem('token');
  if (this.timerRef) {
    clearTimeout(this.timerRef);
    this.timerRef = null;
  }
}


  
forgotPassword(email: string) {
  return this.http.get<{ token: any }>(
    `${environment.apiBaseUrl}/traders/initiate-password-change`,
    {
      params: { email }
    }
  );
}


completePassword(otp: string, newPassword:string ) {

  return this.http.put<{ token: any }>(
    `${environment.apiBaseUrl}/traders/complete-password-change`,
    {
      params: { otp,newPassword }
    }
  );
}

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

setToken(token: string): void {
  localStorage.setItem('token', token);
}

setEntity(entity: string): void {
  localStorage.setItem('entity', entity);
}




  getToken(): string | null {
    return localStorage.getItem('token');
  }
  getEntityUrl(): string | null {
    return localStorage.getItem('entity');
  }




 

// admin 
createAdmin(email: string,password: string,firstName: string,lastName: string,phoneNumber: string, userName:string){
const payload = {email, password, name: {first: firstName,last: lastName}, phoneNumber,userName};
    return this.http.post(`${environment.apiBaseUrl}/admins`, payload);

  
}

// end admin

}
