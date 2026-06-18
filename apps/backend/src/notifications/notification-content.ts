import type { NotificationPayload } from './notifications.types';

export type NotificationLanguage = 'zh' | 'en' | 'fr';

/** Falls back to French (the app default) for unknown/missing languages. */
export function normalizeLanguage(
  language?: string | null,
): NotificationLanguage {
  if (language === 'zh' || language === 'en') {
    return language;
  }

  return 'fr';
}

type LocalizedText = { title: string; body: string };

const ACCOUNT_APPROVED: Record<NotificationLanguage, LocalizedText> = {
  zh: {
    title: '账号已通过',
    body: '您的账号已审核通过，欢迎加入赵氏大家庭！',
  },
  en: {
    title: 'Account approved',
    body: 'Your account has been approved. Welcome to the ZHAO family!',
  },
  fr: {
    title: 'Compte validé',
    body: 'Votre compte a été approuvé. Bienvenue dans la famille ZHAO !',
  },
};

export function accountApprovedNotification(
  language?: string | null,
): NotificationPayload {
  return {
    ...ACCOUNT_APPROVED[normalizeLanguage(language)],
    data: { type: 'account-approved' },
  };
}

const NEW_TRAINING_MATERIAL: Record<
  NotificationLanguage,
  (title: string) => LocalizedText
> = {
  zh: (title) => ({
    title: '新培训材料',
    body: `新增培训材料：${title}`,
  }),
  en: (title) => ({
    title: 'New training material',
    body: `New training material available: ${title}`,
  }),
  fr: (title) => ({
    title: 'Nouveau support de formation',
    body: `Nouveau support de formation : ${title}`,
  }),
};

export function newTrainingMaterialNotification(
  language: string | null | undefined,
  materialId: number | bigint,
  title: string,
): NotificationPayload {
  return {
    ...NEW_TRAINING_MATERIAL[normalizeLanguage(language)](title),
    data: { type: 'training-material', materialId: String(materialId) },
  };
}

const DASHBOARD_POST: Record<
  NotificationLanguage,
  (title: string) => LocalizedText
> = {
  zh: (title) => ({
    title: '最新公告',
    body: title,
  }),
  en: (title) => ({
    title: 'New announcement',
    body: title,
  }),
  fr: (title) => ({
    title: 'Nouvelle annonce',
    body: title,
  }),
};

export function dashboardPostNotification(
  language: string | null | undefined,
  postId: number | bigint,
  title: string,
): NotificationPayload {
  return {
    ...DASHBOARD_POST[normalizeLanguage(language)](title),
    data: { type: 'dashboard-news', postId: String(postId) },
  };
}
