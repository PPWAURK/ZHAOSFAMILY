export type DashboardNewsVisibility = "public" | "management" | "all" | string;

export type DashboardNewsCategory = "operations" | "training" | "all" | string;

export type DashboardNewsAttachmentApiRecord = {
  name?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  bucket?: string | null;
  objectKey?: string | null;
};

export type DashboardNewsReadConfirmation = {
  isRequired?: boolean | null;
  confirmedAt?: string | null;
};

export type DashboardNewsReadSummary = {
  totalRecipients?: number | null;
  readCount?: number | null;
  unreadCount?: number | null;
  readRate?: number | null;
};

export type DashboardNewsReadStatusItem = {
  userId?: number | string | null;
  name?: string | null;
  restaurantName?: string | null;
  confirmedAt?: string | null;
};

export type DashboardNewsReadStatusApiRecord = {
  isTracked?: boolean | null;
  summary?: DashboardNewsReadSummary | null;
  read?: DashboardNewsReadStatusItem[] | null;
  unread?: DashboardNewsReadStatusItem[] | null;
};

export type DashboardNewsPostApiRecord = {
  id: number | string;
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  category?: DashboardNewsCategory | null;
  visibility?: DashboardNewsVisibility | null;
  tags?: string[] | null;
  attachment?: DashboardNewsAttachmentApiRecord | null;
  restaurantId?: number | string | null;
  restaurantName?: string | null;
  author?: {
    id?: number | string;
    name?: string | null;
    email?: string | null;
  } | null;
  canDelete?: boolean | null;
  readConfirmation?: DashboardNewsReadConfirmation | null;
  readSummary?: DashboardNewsReadSummary | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DashboardNewsAttachment = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  bucket: string;
  objectKey: string;
  href: string;
};

export type DashboardNewsPost = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: DashboardNewsCategory;
  visibility: DashboardNewsVisibility;
  tags: string[];
  attachment: DashboardNewsAttachment | null;
  restaurantId?: number | string | null;
  restaurantName: string;
  author: {
    id?: number | string;
    name: string;
    email: string;
  };
  canDelete: boolean;
  readConfirmation: {
    isRequired: boolean;
    confirmedAt: string | null;
  } | null;
  readSummary: {
    totalRecipients: number;
    readCount: number;
    unreadCount: number;
    readRate: number;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DashboardNewsReadStatus = {
  isTracked: boolean;
  summary: DashboardNewsPost["readSummary"];
  read: {
    userId: string;
    name: string;
    restaurantName: string;
    confirmedAt: string | null;
  }[];
  unread: {
    userId: string;
    name: string;
    restaurantName: string;
    confirmedAt: string | null;
  }[];
};

export type DashboardNewsFilters = {
  category?: DashboardNewsCategory;
  visibility?: DashboardNewsVisibility;
  q?: string;
};

export type CreateDashboardNewsPostInput = {
  title: string;
  summary: string;
  body: string;
  category: string;
  visibility: string;
  tags: string[];
  attachment?: Omit<DashboardNewsAttachment, "href"> | null;
};

export type UploadedDashboardNewsAttachment = Omit<DashboardNewsAttachment, "href">;
