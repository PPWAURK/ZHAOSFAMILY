export const DASHBOARD_NEWS_CATEGORIES = [
  'operations',
  'people',
  'training',
  'quality',
] as const;

export const DASHBOARD_NEWS_VISIBILITIES = ['public', 'management'] as const;

export type DashboardNewsCategory = (typeof DASHBOARD_NEWS_CATEGORIES)[number];

export type DashboardNewsVisibility =
  (typeof DASHBOARD_NEWS_VISIBILITIES)[number];

export type DashboardNewsActor = {
  id: number;
  jobRole: string | null;
  restaurantId: number;
  userLevel: number;
};

export type DashboardNewsAuthor = {
  id: number;
  name: string;
  email: string;
};

export type DashboardNewsAttachment = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  bucket: string;
  objectKey: string;
};

export type DashboardNewsReadConfirmation = {
  isRequired: boolean;
  confirmedAt: string | null;
};

export type DashboardNewsReadSummary = {
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
};

export type DashboardNewsReadStatusItem = {
  userId: number;
  name: string;
  restaurantName: string;
  confirmedAt: string | null;
};

export type DashboardNewsReadStatus = {
  isTracked: boolean;
  summary: DashboardNewsReadSummary | null;
  read: DashboardNewsReadStatusItem[];
  unread: DashboardNewsReadStatusItem[];
};

export type DashboardNewsPost = {
  id: number;
  title: string;
  summary: string;
  body: string;
  category: DashboardNewsCategory;
  visibility: DashboardNewsVisibility;
  tags: string[];
  attachment: DashboardNewsAttachment | null;
  restaurantId: number;
  restaurantName: string;
  author: DashboardNewsAuthor;
  canDelete: boolean;
  readConfirmation: DashboardNewsReadConfirmation | null;
  readSummary: DashboardNewsReadSummary | null;
  createdAt: string;
  updatedAt: string;
};
