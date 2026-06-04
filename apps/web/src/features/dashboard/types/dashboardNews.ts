export type DashboardNewsVisibility = "team" | "store" | "all" | string;

export type DashboardNewsCategory = "operations" | "training" | "all" | string;

export type DashboardNewsAttachmentApiRecord = {
  name?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  bucket?: string | null;
  objectKey?: string | null;
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
  createdAt?: string | null;
  updatedAt?: string | null;
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
