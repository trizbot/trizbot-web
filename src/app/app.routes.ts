import { Routes } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';
import { WelcomeComponent } from '../home/welcome/welcome.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotComponent } from './auth/forgot/forgot.component';

import { CompletePasswordComponent } from './auth/complete-password/complete-password.component';

export const routes: Routes = [
  {
    path: 'home',
    redirectTo: 'welcome/welcome',
    pathMatch: 'full',
  },

  {
    path: '',
    component: WelcomeComponent,
    children: [
      {
        path: 'welcome',
        loadChildren: () =>
          import('../home/welcome/welcome.routes').then(
            (m) => m.WelcomeRoutes
          ),
      },
    ],
  },


  {
    path: 'auth',
    component: BlankComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'forgot', component: ForgotComponent },
      { path: 'complete', component: CompletePasswordComponent },
      
    ],
  },
  


  
  {
    path: '',
    component: FullComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/pages.routes').then((m) => m.PagesRoutes),
      },
      {
        path: 'myaccount',
        loadChildren: () =>
          import('./pages/myaccount/myaccount.routes').then(
            (m) => m.UiComponentsRoutes
          ),
      },
      {
        path: 'extra',
        loadChildren: () =>
          import('./pages/extra/extra.routes').then((m) => m.ExtraRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'auth/error',
  },
];
