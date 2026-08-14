export interface BeneficiaryLookupResBody {
  entityId?: string;
  id?: string;
  _id?: string;
  username?: string;
  userName?: string;
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
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

export interface MongoObjectId {
  $oid: string;
}

export interface MongoDate {
  $date: string;
}

export interface TransferHistoryItem {
  _id?: string | MongoObjectId;
  senderId: string | MongoObjectId;
  senderName: string;
  senderEmail: string;
  receiverId: string | MongoObjectId;
  receiverName: string;
  receiverEmail: string;
  amount: number;
  senderBalanceAfter?: number;
  receiverBalanceAfter?: number;
  reference: string;
  narration?: string;
  status: string; // e.g. 'Completed' | 'Pending' | 'Failed'
  createdAt: string | MongoDate;
  updatedAt?: string | MongoDate;
}