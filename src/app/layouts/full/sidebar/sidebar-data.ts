import { NavItem } from './nav-item/nav-item';

const entityName = localStorage.getItem('entityName');
const isSuperAdminType = localStorage.getItem('isSuperAdminType');
const isNormalAdminType = localStorage.getItem('isNormalAdminType');
let navItems: NavItem[] = [];

if (entityName === 'Admin' && isSuperAdminType==="true") {
  navItems = [
    { displayName: 'Dashboard', iconName: 'layout-dashboard', route: '/dashboard' },
    { displayName: 'Users', iconName: 'users', route: '/myaccount/users' },
    { displayName: 'List Trade', iconName: 'list-plus', route: '/myaccount/crypto' },
    { displayName: 'Available Trades', iconName: 'box', route: '/myaccount/available' },
    { displayName: 'Withdrawal Updates', iconName: 'banknote', route: '/myaccount/payouts' },
    { displayName: 'Notifications', iconName: 'send', route: '/myaccount/notification' },
    // { displayName: 'Live Chats', iconName: 'message-circle', route: '/myaccount/crypto' },
    // { displayName: 'Refer', iconName: 'users', route: '/myaccount/refer' },
  ];
} 
else if (entityName === 'Admin') {
  navItems = [
    { displayName: 'Dashboard', iconName: 'layout-dashboard', route: '/dashboard' },
    { displayName: 'List Trade', iconName: 'list-checks', route: '/myaccount/crypto' },
    { displayName: 'Available Trades', iconName: 'box', route: '/myaccount/available' },
    { displayName: 'Withdrawals', iconName: 'banknote', route: '/myaccount/payouts' },
    { displayName: 'Notifications', iconName: 'send', route: '/myaccount/notification' },
    
    
  ];
} else {
  navItems = [
    { displayName: 'Dashboard', iconName: 'layout-dashboard', route: '/dashboard' },
    { displayName: 'Wallet', iconName: 'wallet', route: '/myaccount/wallets' },
    { displayName: 'My Trades', iconName: 'repeat', route: '/myaccount/history' },
    { displayName: 'Change Password', iconName: 'key', route: '/myaccount/password' },
    { displayName: 'Settings', iconName: 'settings', route: '/myaccount/profile' },
    // { displayName: 'Live Chats', iconName: 'message-circle', route: '/myaccount/crypto' },
    { displayName: 'Refer', iconName: 'users', route: '/myaccount/refer' },
    
  ];
}

export { navItems };
