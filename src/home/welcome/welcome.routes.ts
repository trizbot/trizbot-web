import { Routes } from '@angular/router';

import { WelcomeComponent } from './welcome.component';
import { FaqComponent } from '../../app/auth/faq/faq.component';

export const WelcomeRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'welcome',
        component: WelcomeComponent,
      },
     
      {
        path: 'faq',
        component: FaqComponent,
      },
     
     
    ],
  },
];
