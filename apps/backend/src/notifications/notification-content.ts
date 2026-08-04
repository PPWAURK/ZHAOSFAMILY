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

const ABC_GRADE_BOARD_PUBLISHED: Record<
  NotificationLanguage,
  (cycleLabel: string) => LocalizedText
> = {
  zh: (cycleLabel) => ({
    title: 'ABC 评级排行榜已公布',
    body: `${cycleLabel} 的门店评级排行榜现已公布。`,
  }),
  en: (cycleLabel) => ({
    title: 'ABC grade board published',
    body: `The ABC store grade board for ${cycleLabel} is now available.`,
  }),
  fr: (cycleLabel) => ({
    title: 'Classement ABC publié',
    body: `Le classement des niveaux ABC pour ${cycleLabel} est disponible.`,
  }),
};

export function abcGradeBoardPublishedNotification(
  language: string | null | undefined,
  cycleId: number | bigint,
  cycleLabel: string,
): NotificationPayload {
  return {
    ...ABC_GRADE_BOARD_PUBLISHED[normalizeLanguage(language)](cycleLabel),
    data: { type: 'abc-grade-board', cycleId: String(cycleId) },
  };
}

const CASE_SHARE_LIKE: Record<
  NotificationLanguage,
  (actorName: string) => LocalizedText
> = {
  zh: (actorName) => ({
    title: '收到一个赞',
    body: `${actorName} 点赞了你的案例`,
  }),
  en: (actorName) => ({
    title: 'New like',
    body: `${actorName} liked your case`,
  }),
  fr: (actorName) => ({
    title: "Nouveau j'aime",
    body: `${actorName} a aimé votre cas`,
  }),
};

export function caseShareLikeNotification(
  language: string | null | undefined,
  caseShareId: number | bigint,
  actorName: string,
): NotificationPayload {
  return {
    ...CASE_SHARE_LIKE[normalizeLanguage(language)](actorName),
    data: { type: 'case-share', caseShareId: String(caseShareId) },
  };
}

const CASE_SHARE_COMMENT: Record<
  NotificationLanguage,
  (actorName: string) => LocalizedText
> = {
  zh: (actorName) => ({
    title: '收到新评论',
    body: `${actorName} 评论了你的案例`,
  }),
  en: (actorName) => ({
    title: 'New comment',
    body: `${actorName} commented on your case`,
  }),
  fr: (actorName) => ({
    title: 'Nouveau commentaire',
    body: `${actorName} a commenté votre cas`,
  }),
};

export function caseShareCommentNotification(
  language: string | null | undefined,
  caseShareId: number | bigint,
  actorName: string,
): NotificationPayload {
  return {
    ...CASE_SHARE_COMMENT[normalizeLanguage(language)](actorName),
    data: { type: 'case-share', caseShareId: String(caseShareId) },
  };
}
