import { Routes } from '@angular/router';

// ui
import { ProfileComponent } from './profile/profile.component';
import { AvailableComponent } from './available/available.component';
import { AdminComponent } from './admin/admin.component';
import { CryptoComponent } from './crypto/crypto.component';
import { SendnotificationComponent } from './notification/notification.component';
import { WalletComponent } from './wallets/wallets.component';
import { LoginComponent } from '../../auth/login/login.component';
import { RegisterComponent } from '../../auth/register/register.component';
import { InvestmentComponent } from './invest/investment.component';
import { HistoryComponent } from './history/history.component';
import { UsersComponent } from './users/users.component';
import { ReviewComponent } from './reviews/review.component';
import { ChangePasswordComponent } from './password/change-password.component';
import { DepositComponent } from './deposit/deposit.component';
import { DepositConfirmationComponent } from './confirmation/deposit-confirmation.component';
import { WithdrawComponent } from './withdraw/withdraw.component';
import { PayoutsComponent } from './payouts/payouts.component';
import { ReferComponent } from './refer/refer.component';
import { ChatComponent } from './chat/chat.component';
import { SettingComponent } from './setting/setting.component';
import { TraderCashRewardComponent } from './cash-reward/cash-reward.component';

export const UiComponentsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'profile',
        component: ProfileComponent,
      },
      {
        path: 'available',
        component: AvailableComponent,
      },
      {
        path: 'withdraw',
        component: WithdrawComponent,
      },
     
      {
        path: 'notification',
        component: SendnotificationComponent,
      },
     
      {
        path: 'confirmation',
        component: DepositConfirmationComponent,
      },

      {
        path: 'deposit',
        component: DepositComponent,
      },
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'register',
        component: RegisterComponent,
      },
      
      {
        path: 'admin',
        component: AdminComponent,
      },
      
      {
        path: 'crypto',
        component: CryptoComponent,
      },

      {
        path: 'invest/:id',
        component: InvestmentComponent
      },
      {
        path: 'users-disabled-feature/:id',
        component: InvestmentComponent
      },

      {
        path: 'review/:id',
        component: ReviewComponent
      },      

      {
        path: 'history',
        component: HistoryComponent
      },      

      {
        path: 'users',
        component: UsersComponent
      },      
      {
        path: 'wallets',
        component: WalletComponent
      },      
 
      {
        path: 'password',
        component: ChangePasswordComponent
      },      
 
      {
        path: 'payouts',
        component: PayoutsComponent
      },      
      {
        path: 'refer',
        component: ReferComponent
      },      
 
      {
        path: 'chat',
        component: ChatComponent
      },      
 
      {
        path: 'setting',
        component: SettingComponent
      },      
      {
        path: 'cash-reward',
        component: TraderCashRewardComponent
      },      
 

    ],
  },
];
