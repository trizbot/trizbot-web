import { Name } from '../shared/components/shared.types';

export type RememberMeState = {
  email: string;
  rememberMe: boolean;
};

export type SignupDto = {
  name: Name;
  email: string;
  password: string;
  phoneNumber: string;
};

export type SigninDto = {
  email: string;
  password: string;
};

export type GetWeeklyStatisticsResBody = {
  data: {
    totalUsers: string;
    totalActiveUsers: string;
    totalWeeklyFunds: string;
    totalWeeklyProfits: string;
  };
};

export type PayoutTransactionResBody = {
  data: {
    senderEmail: string;
    transactionType: string;
    amount: number;
    senderName: string;
    description: string;
    transReference: string;
    is_request_payouts: boolean;
    id: string;
    address: string;
    currency: string;
    amount_withdrawn: number;
    batch_withdrawal_id: string;
    ipn_callback_url: string;
    status: string;
    extra_id: string;
    hash: string;
    error: string;
    payout_description: string;
    unique_external_id: string;
    created_at: string;
    requestedAt: string;
    updatedAt: string;
  };
};


export type AuthResBody = {
  data: {
    authToken: string;
    expiresIn: string;
    refreshToken: string;
    entityName: string;
    entityId: string;
  };
};
export type GetNotificationResBody = {
  data: {
    title: string;
    text: string;
    _id: any;
    
  };
};

export type AuthEntityResBody = {
    entityName: string;

};

export type AuthData = AuthResBody & {
  authTokenExpiryDate: Date;
};

export type GetTraderResBody = {
  data: {
    _id: string;
    firstName: string;
    lastName: string;
    approvalStatus: string;
    userName: string;
    entityName: string;
    referralLink: string;
    email: string;
    phoneNumber: string;
    walletBalance: string;
    walletAddress: string;
    amountInvested: string;
    isSuperAdmin: boolean;
    profit: string;
    createdAt: string;
    depositBalance: string;
    imageSecureUrl: string;
    tradeStatus: string;
    reviewerId: string;
    address: string;
    payoutDescription: string;
    payoutStatus: boolean;
    isCryptoAvailableStatus: boolean;
    isCryptoAvailableDescription: string;
    uplinerBonusAmount: number;
    tradeRewardCashWalletBalance: string;
      
  isWalletDisabled?: boolean;

  
  isWithdrawalDisabled?: boolean;
 

  isDepositDisabled?: boolean;

  };
};
export type GetChargeResBody = {
  data: {
    _id: string;
    usdtBscDepositAmount: string;
    usdtPolygonDepositAmount: string;
    usdtBscPayoutAmount: string;
    usdtPolygonPayoutAmount: string;
    minimumDepositAmount: string;
    minimumPayoutAmount: string;
    minimumTradeAmount: string;
    
  };
};

export type GetDownlinesResBody = {
  data: {
    _id: string;
    firstName: string;
    lastName: string;
    approvalStatus: string;
    userName: string;
    entityName: string;
    email: string;
    phoneNumber: string;
    walletBalance: string;
    walletAddress: string;
    amountInvested: string;
    profit: string;
    createdAt: string;
    imageSecureUrl: string;
  
  };
};
export type GetReferralDetailResBody = {
  data: {
    firstName: string;
    lastName?: string;
    userName: string;
    name?: {
      first: string;
      middle?: string;
      last: string;
    };
    _id?: string;
  }[];
};


export type GetAllTradersResBody = {
  data: {
    
   _id: string;
    firstName: string;
    countryCode: string;
    country: string;
    lastName: string;
    approvalStatus: string;
    userName: string;
    entityName: string;
    email: string;
    phoneNumber: string;
    walletBalance: string;
    walletAddress: string;
    amountInvested: string;
    imageUrl: string;
    isSuperAdmin: boolean;
    profit: string;
    depositBalance: string;
    createdAt: string;
    referralCount: string;
    imageSecureUrl: string;
  };
};

export type GetAllAdminsResBody = {
  data: {
   _id: string;
    firstName: string;
    lastName: string;
    approvalStatus: string;
    userName: string;
    entityName: string;
    email: string;
    phoneNumber: string;
    walletBalance: string;
    walletAddress: string;
    amountInvested: string;
    imageUrl: string;
    isSuperAdmin: boolean;
    profit: string;
    createdAt: string;
    imageSecureUrl: string;
  };
};

export type GetCryptoResBody = {
    _id: string;
    minAmount: string;
    category: string;
    title: string;
    imageSecureUrl: string;
    operationStatus: boolean;
    profit: string;
    expiry: string;
    percentage: string;
    createdAt: string;
    updatedAt: string;
    buyExchange: string,
    sellExchange: string,
    tradeStatus: string,
    status: boolean,
    description: string,

};

export type GetInvestmentResBody = {
    _id: string;
    amount: string;
    transactionStatus: string;
    transactionKind: string;
    createdAt: string;
    traderEmail:string;
    curBalance: any;
    profit: any;
    prevBalance: any;
    transactionType:string;
    cryptoId: string;
    cryptoName: string;
    description: string;
    traderId: string;
    traderName: {first:string,middle:string, last:string};
    expiry: any;
    imageUrl: string;
    investmentStatus: string;
    operationStatus: boolean;
    updatedAt: string;
};

export type GetCompletedInvestmentResBody = {
    _id: string;
    amount: string;
    transactionStatus: string;
    transactionKind: string;
    createdAt: string;
    traderEmail:string;
    curBalance: any;
    profit: any;
    prevBalance: any;
    transactionType:string;
    cryptoId: string;
    cryptoName: string;
    description: string;
    traderId: string;
    traderName: {first:string,middle:string, last:string};
    expiry: any;
    imageUrl: string;
    investmentStatus: string;
    operationStatus: boolean;
    updatedAt: string;
};

export type GetHistoryResBody = {
    _id: string;
    amount: string;
    transactionStatus: string;
    transactionKind: string;
    createdAt: Date;
    updatedAt: string;
    traderEmail:string;
    curBalance: any;
    profit: any;
    prevBalance: any;
    transactionType:string;
    cryptoId: string;
    cryptoName: string;
    description: string;
    traderId: string;
    traderName: {first:string,middle:string, last:string};
    expiry: string;
    imageUrl: string;
    investmentStatus: string;
    operationStatus: boolean;
};

export type GetAdminResBody = {
  data: {
    _id: string;
    firstName: string;
    lastName: string;
    entityName: string;
    email: string;
    phoneNumber: string;
    walletBalance: string;
    walletAddress: string;
    approvalStatus: string;
    amountInvested:string;
    isSuperAdmin: boolean;
    profit:string;
    createdAt: string;
    
    imageSecureUrl: string;
  };
};

export type GetDepositResBody = {
    payment_id: string;
    payment_status: string;
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    pay_currency: string;
    order_id: string;
    order_description: string;
    ipn_callback_url: string;
    created_at: string;
    updated_at: string;
    purchase_id: string;
    amount_received: number | null;
    payin_extra_id: string | null;
    smart_contract: string;
    network: string;
    network_precision: number;
    time_limit: string | null;
    burning_percent: string | null;
    expiration_estimate_date: string;
    valid_until: string;
    expiry: string;
  
};


export type CompletePwChangeDto = {
  otp: string;
  newPassword: string;
};
