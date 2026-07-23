
export interface BeneficiaryLookupResBody {
  entityId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}



export interface TransferReqBody {
  recipientIdentifier: string;
  amount: number;
  transactionPin: string;
  reference: string;
  narration?: string;
}

export interface TransferResBody {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  reference: string;
  narration?: string;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
}

export interface TransferHistoryItem {
  id: string;
  amount: number;
  reference: string;
  narration?: string;
  status: 'success' | 'pending' | 'failed';
  direction: 'debit' | 'credit';
  counterpartyName: string;
  counterpartyUsername: string;
  createdAt: string;
}