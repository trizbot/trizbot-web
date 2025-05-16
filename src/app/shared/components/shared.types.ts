export type Address = {
  full: string;
  city: string;
  state: string;
  country: string;
};

export type Name = {
  first: string;
  last: string;
};

export type SimpleResBody = {
  message: string;
};

export type SimpleReqQuery = {
  searchText?: string;
  pageNumber: number;
  pageSize: number;
};

export type GetEntityCountResBody = {
  message: string;
  data: {
    count: number;
  };
};

export type ApproveEntityReqBody = {
  action: 'Approved' | 'Disapproved' | 'Suspended';
  comment: string;
};

export type Image = {
  url: string;
};

export type UploadedFile = {
  url: string;
};

export type Coords = {
  lng: number;
  lat: number;
};

export type GetFileUploadURLResBody = {
  message: string;
  data: {
    url: string;
    key: string;
  };
};

export type GetFileUploadURLQueryParams = {
  fileType: string;
  folderName: string;
};
