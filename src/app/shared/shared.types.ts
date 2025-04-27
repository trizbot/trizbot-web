export enum EntityEnum {
  Admin = 'Admin',
  Traders = 'Traders',
}

export type EntityGroupCategory =
  | 'traders'
  | 'admins';
export type EntityTaskCategory =
| 'traders'
| 'admins';
  


  
export type GetDataDto = {
  pageNumber: number;
  pageSize: number;
  entityName?: EntityEnum;
  searchText?: string;
  filter?: string;
  approvalStatus?: string;
};

export type GetTransactionsDto = GetDataDto & {
  transactionType: 'Credit' | 'Debit';
};

export type GetEntityCountResBody = {
  data: number;
};

export interface GetFileUploadUrlResBody {
  message: string;
  data: {
    url: string;
    key: string;
  };
}

export enum S3BucketFolderNameEnum {
  tradersProfilePictures = 'traders-pictures',
  adminProfilePictures = 'admin-profile-pictures',
}

export type UploadedFile = {
  key: string;
  url: string;
};

export enum EntityApprovalStatusEnum {
  Pending = 'Pending',
  Approved = 'Approved',
  Suspended = 'Suspended',
}

export type Creator = {
  id: string;
  name: string;
};

export type Option = {
  name: string;
  value: string;
};
