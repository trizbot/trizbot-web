import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { environment } from '../../environments/environment';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    data: {
      title: environment.companyName,
      urls: [
        { title: 'Dashboard', url: '/dashboards/dashboard1' },
        { title: 'Dashboard' },
      ],
    },
  },
];
