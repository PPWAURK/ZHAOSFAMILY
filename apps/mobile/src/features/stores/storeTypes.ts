export type MobileStore = {
  id: number;
  name: string;
  address: string;
  photoUrl: string | null;
  storeCode: string;
  photoUri: string | null;
};

export type MobilePermissionUser = {
  id: number;
  email: string | null;
  name: string | null;
  accountStatus: string | null;
  jobRole: string | null;
  restaurant: {
    id: number;
    name: string | null;
  } | null;
};

export type StoreApprovalDraft = {
  jobRole: string;
};

export type StoreTeamDraft = {
  jobRole: string;
};

export type StoreJobRoleOption = {
  value: string;
  label: string;
};
