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
    title: '欢迎加入赵氏大家庭！',
    body: '你的账号已通过审核，现在可以登录啦。很高兴与你一起开启新的旅程！',
  },
  en: {
    title: 'Welcome to the ZHAO family!',
    body: "Your account is approved. We're happy to have you with us — you can now sign in.",
  },
  fr: {
    title: 'Bienvenue dans la famille ZHAO !',
    body: 'Votre compte est validé. Nous sommes heureux de vous accueillir ! Vous pouvez maintenant vous connecter.',
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

const EMPLOYEE_REGISTRATION: Record<
  NotificationLanguage,
  (employeeName: string, restaurantName: string) => LocalizedText
> = {
  zh: (employeeName, restaurantName) => ({
    title: '有新伙伴想加入',
    body: `${employeeName} 申请加入 ${restaurantName}，请抽空看看这份申请吧。`,
  }),
  en: (employeeName, restaurantName) => ({
    title: 'A new teammate would like to join',
    body: `${employeeName} has applied to join ${restaurantName}. Take a moment to review the application when you can.`,
  }),
  fr: (employeeName, restaurantName) => ({
    title: 'Une candidature à découvrir',
    body: `${employeeName} souhaite rejoindre ${restaurantName}. Prenez un moment pour découvrir sa candidature.`,
  }),
};

export function employeeRegistrationNotification(
  language: string | null | undefined,
  employeeId: number,
  employeeName: string,
  restaurantName: string,
): NotificationPayload {
  return {
    ...EMPLOYEE_REGISTRATION[normalizeLanguage(language)](
      employeeName,
      restaurantName,
    ),
    data: { type: 'employee-registration', employeeId: String(employeeId) },
  };
}

const RECRUITMENT_REQUEST: Record<
  NotificationLanguage,
  (restaurantName: string, position: string, headcount: number) => LocalizedText
> = {
  zh: (restaurantName, position, headcount) => ({
    title: '门店需要新伙伴啦',
    body: `${restaurantName} 想招募 ${headcount} 名${position}，一起看看这份需求吧。`,
  }),
  en: (restaurantName, position, headcount) => ({
    title: 'A store is looking for new teammates',
    body: `${restaurantName} is looking for ${headcount} ${position}${headcount === 1 ? '' : 's'}. Take a look at the request when you can.`,
  }),
  fr: (restaurantName, position, headcount) => ({
    title: 'Une boutique cherche de nouveaux collègues',
    body: `${restaurantName} souhaite pourvoir ${headcount} poste${headcount === 1 ? '' : 's'} de ${position}. Consultez sa demande quand vous le pouvez.`,
  }),
};

const RECRUITMENT_POSITION_LABELS: Record<
  NotificationLanguage,
  Record<string, string>
> = {
  zh: { waiter: '服务员', chef: '厨师', kitchen_assistant: '厨房助理' },
  en: {
    waiter: 'waiter',
    chef: 'chef',
    kitchen_assistant: 'kitchen assistant',
  },
  fr: { waiter: 'serveur', chef: 'chef', kitchen_assistant: 'aide-cuisinier' },
};

export function recruitmentRequestNotification(
  language: string | null | undefined,
  recruitmentRequestId: number,
  restaurantName: string,
  position: string,
  headcount: number,
): NotificationPayload {
  const normalizedLanguage = normalizeLanguage(language);
  const localizedPosition =
    RECRUITMENT_POSITION_LABELS[normalizedLanguage][position] ?? position;

  return {
    ...RECRUITMENT_REQUEST[normalizedLanguage](
      restaurantName,
      localizedPosition,
      headcount,
    ),
    data: {
      type: 'recruitment-request',
      recruitmentRequestId: String(recruitmentRequestId),
    },
  };
}

const NEW_TRAINING_MATERIAL: Record<
  NotificationLanguage,
  (title: string) => LocalizedText
> = {
  zh: (title) => ({
    title: '新学习内容来啦',
    body: `为你准备了新培训资料《${title}》，有空来看看吧。`,
  }),
  en: (title) => ({
    title: 'New learning material for you',
    body: `"${title}" is ready whenever you have a moment to explore it.`,
  }),
  fr: (title) => ({
    title: 'Une nouvelle ressource pour vous',
    body: `Le support « ${title} » est prêt. Découvrez-le quand vous le souhaitez.`,
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
    title: '有一则新消息想和你分享',
    body: `新公告《${title}》已发布，欢迎来看看。`,
  }),
  en: (title) => ({
    title: 'Something new to share with you',
    body: `A new announcement is here: ${title}`,
  }),
  fr: (title) => ({
    title: 'Une nouvelle à partager avec vous',
    body: `Une annonce vient d’être publiée : ${title}`,
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
    title: '门店评级榜单出炉啦',
    body: `${cycleLabel} 的 ABC 门店评级榜单已经公布，一起来看看吧。`,
  }),
  en: (cycleLabel) => ({
    title: 'The latest ABC store rankings are here',
    body: `The ABC store rankings for ${cycleLabel} are ready. Come take a look!`,
  }),
  fr: (cycleLabel) => ({
    title: 'Le classement ABC est arrivé',
    body: `Le classement ABC des boutiques pour ${cycleLabel} est disponible. Venez le découvrir !`,
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
    title: '你的案例收获了赞',
    body: `${actorName} 赞了你的案例，感谢你的分享！`,
  }),
  en: (actorName) => ({
    title: 'Someone liked your case',
    body: `${actorName} liked your case. Thanks for sharing it!`,
  }),
  fr: (actorName) => ({
    title: 'Votre cas a plu',
    body: `${actorName} a aimé votre cas. Merci pour ce partage !`,
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
    title: '你的案例有新回应',
    body: `${actorName} 评论了你的案例，来看看对方的想法吧。`,
  }),
  en: (actorName) => ({
    title: 'Your case has a new comment',
    body: `${actorName} commented on your case. Take a look when you can.`,
  }),
  fr: (actorName) => ({
    title: 'Votre cas suscite un échange',
    body: `${actorName} a commenté votre cas. Venez découvrir son message !`,
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
