export enum KycDocumentTypeEnum {
  Passport = 'Passport',
  NationalId = 'NationalId',
  DriversLicense = 'DriversLicense',
  VotersCard = 'VotersCard',
}

export enum KycStatusEnum {
  NotSubmitted = 'NotSubmitted',
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export interface KycRecord {
  id: string;
  entityId: string;
  documentType: KycDocumentTypeEnum;
  documentNumber: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl: string;
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
  status: KycStatusEnum;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SubmitKycPayload {
  documentType: KycDocumentTypeEnum;
  documentNumber: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl: string;
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface ReviewKycPayload {
  status: KycStatusEnum.Approved | KycStatusEnum.Rejected;
  rejectionReason?: string;
}

export const KYC_DOCUMENT_TYPE_OPTIONS: KycDocumentTypeEnum[] = [
  KycDocumentTypeEnum.Passport,
  KycDocumentTypeEnum.NationalId,
  KycDocumentTypeEnum.DriversLicense,
  KycDocumentTypeEnum.VotersCard,
];

export const KYC_DOCUMENT_TYPE_LABELS: Record<KycDocumentTypeEnum, string> = {
  [KycDocumentTypeEnum.Passport]: 'Passport',
  [KycDocumentTypeEnum.NationalId]: 'National ID',
  [KycDocumentTypeEnum.DriversLicense]: "Driver's License",
  [KycDocumentTypeEnum.VotersCard]: "Voter's Card",
};