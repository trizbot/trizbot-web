import { NavItem } from './nav-item/nav-item';

const entityName = localStorage.getItem('entityName');
const isSuperAdminType = localStorage.getItem('isSuperAdminType') === 'true';

let navItems: NavItem[] = [];




if (entityName === 'Admin' && isSuperAdminType) {
  navItems = [
    { displayName: 'Dashboard', iconName: 'layout-dashboard', route: '/dashboard' },
    { displayName: 'Users', iconName: 'users', route: '/myaccount/users' },
    { displayName: 'List Trade', iconName: 'list-plus', route: '/myaccount/crypto' },
    { displayName: 'Available Trades', iconName: 'box', route: '/myaccount/available' },
    { displayName: 'Withdrawal Updates', iconName: 'banknote', route: '/myaccount/payouts' },
    { displayName: 'Send Notifications', iconName: 'send', route: '/myaccount/sendnotifications' },
    // { displayName: 'Live Chats', iconName: 'message-circle', route: '/myaccount/crypto' },
    // { displayName: 'Refer', iconName: 'users', route: '/myaccount/refer' },
    { displayName: 'Logout', iconName: 'logout', route: '/auth/login' },
  ];
} else if (entityName === 'Admin'&& !isSuperAdminType) {
  navItems = [
    { displayName: 'Dashboard', iconName: 'layout-dashboard', route: '/dashboard' },
    { displayName: 'List Trade', iconName: 'list-checks', route: '/myaccount/crypto' },
    { displayName: 'Available Trades', iconName: 'box', route: '/myaccount/available' },
    { displayName: 'Withdrawals', iconName: 'banknote', route: '/myaccount/payouts' },
    { displayName: 'Send Notifications', iconName: 'send', route: '/myaccount/sendnotifications' },
    // { displayName: 'Refer', iconName: 'users', route: '/myaccount/refer' },
    { displayName: 'Logout', iconName: 'logout', route: '/auth/login' },
  ];
} else if (entityName === 'Trader'&& !isSuperAdminType) {
  navItems = [
    { displayName: 'Dashboard', iconName: 'layout-dashboard', route: '/dashboard' },
    { displayName: 'Wallet', iconName: 'wallet', route: '/myaccount/wallets' },
    { displayName: 'My Trades', iconName: 'repeat', route: '/myaccount/history' },
    { displayName: 'Change Password', iconName: 'key', route: '/myaccount/password' },
    { displayName: 'Settings', iconName: 'settings', route: '/myaccount/profile' },
    // { displayName: 'Live Chats', iconName: 'message-circle', route: '/myaccount/crypto' },
    { displayName: 'Refer', iconName: 'users', route: '/myaccount/refer' },
    { displayName: 'Logout', iconName: 'logout', route: '/auth/login' },
  ];
} else {
  navItems = [
    { displayName: 'Logout', iconName: 'logout', route: '/auth/login' },
  ];
}

export { navItems };
