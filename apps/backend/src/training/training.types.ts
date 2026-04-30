export const TRAINING_COURSE_SECTIONS = ['required', 'optional'] as const;
export type TrainingCourseSection = (typeof TRAINING_COURSE_SECTIONS)[number];

export const TRAINING_COURSE_TYPES = [
  'VIDEO',
  'PDF',
  'QUIZ',
  'ARTICLE',
] as const;
export type TrainingCourseType = (typeof TRAINING_COURSE_TYPES)[number];

export const TRAINING_COURSE_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
] as const;
export type TrainingCourseStatus = (typeof TRAINING_COURSE_STATUSES)[number];

export type TrainingCourseItem = {
  id: string;
  section: TrainingCourseSection;
  type: TrainingCourseType;
  isRequired: boolean;
  titleCn: string;
  titleEn: string;
  durationLabel: string;
  progressPercent: number;
  status: TrainingCourseStatus;
  description: string;
  tags: string[];
};

export const TRAINING_POSITION_IDS = [
  'FOH',
  'BOH',
  'CASH',
  'SM',
  'RM',
  'ALL',
] as const;
export const TRAINING_MATERIAL_TYPES = [
  'VIDEO',
  'PDF',
  'QUIZ',
  'ARTICLE',
  'IMAGE',
  'OTHER',
] as const;

export type TrainingMaterialItem = {
  id: number;
  positionId: string;
  type: string;
  isRequired: boolean;
  title: string;
  description: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  bucket: string;
  objectKey: string;
  createdAt: string;
  updatedAt: string;
};

export type TrainingPositionItem = {
  code: string;
  name: {
    zh: string;
    en: string;
    fr: string;
  };
  parentCode: string | null;
  isActive: boolean;
  sortOrder: number;
  children: TrainingPositionItem[];
};
