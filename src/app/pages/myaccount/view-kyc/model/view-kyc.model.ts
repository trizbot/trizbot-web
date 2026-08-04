// model/view-kyc.model.ts

export enum KycStatusEnum {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum KycDocumentTypeEnum {
  NationalId = 'NationalId',
  Passport = 'Passport',
  DriversLicense = 'DriversLicense',
  VotersCard = 'VotersCard',
}

export const KYC_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  [KycDocumentTypeEnum.NationalId]: 'National ID',
  [KycDocumentTypeEnum.Passport]: 'Passport',
  [KycDocumentTypeEnum.DriversLicense]: "Driver's License",
  [KycDocumentTypeEnum.VotersCard]: "Voter's Card",
};

export interface KycRecord {
  _id: string;
  entityId: string;
  fullName: string;
  documentType: KycDocumentTypeEnum | string;
  documentNumber: string;
  dateOfBirth?: string;
  address?: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl: string;
  status: KycStatusEnum;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface SubmitKycPayload {
  entityId: string;
  fullName: string;
  documentType: KycDocumentTypeEnum | string;
  documentNumber: string;
  dateOfBirth?: string;
  address?: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl: string;
}

export interface ReviewKycPayload {
  status: KycStatusEnum.Approved | KycStatusEnum.Rejected;
  rejectionReason?: string;
}