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

/**
 * Mongo's extended JSON wraps ObjectIds and Dates instead of returning plain
 * strings. The transfer history endpoint currently returns raw documents in
 * this shape, so the frontend types (and the parsing helpers in the
 * component) account for both the raw and a plain-string form.
 */
export interface MongoObjectId {
  $oid: string;
}

export interface MongoDate {
  $date: string;
}

/**
 * Shape actually returned by GET /transfer/history — a raw transfer document,
 * recorded once per transfer (not once per participant), with both sides'
 * details on it. The frontend derives "credit"/"debit" per row by comparing
 * senderId/senderEmail against the current member.
 */
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