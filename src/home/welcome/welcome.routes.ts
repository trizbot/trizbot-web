import { Routes } from '@angular/router';

import { WelcomeComponent } from './welcome.component';


export const WelcomeRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'welcome',
        component: WelcomeComponent,
      },
     
  
     
    ],
  },
];
