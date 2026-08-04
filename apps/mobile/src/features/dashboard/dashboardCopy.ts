import type { AuthLanguage } from "@/features/auth/authCopy";
import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { MANAGEMENT_JOB_ROLES } from "@zhao/utils";

export type DashboardPrimaryIconName = ComponentProps<typeof Ionicons>["name"];

export type DashboardNavItem = {
  id: string;
  href?: string;
  icon: DashboardPrimaryIconName;
  menuIcon: string;
  requiredPermission?: string;
  visibleForJobRoles?: readonly string[];
  label: Record<AuthLanguage, string>;
  compactLabel?: Partial<Record<AuthLanguage, string>>;
};

export type DashboardMenuItem = {
  id: string;
  icon: string;
  requiredPermission?: string;
  visibleForJobRoles?: readonly string[];
  label: Record<AuthLanguage, string>;
};

export type DashboardMenuGroup = {
  id: string;
  label: Record<AuthLanguage, string>;
  items: DashboardMenuItem[];
};

export const DASHBOARD_PRIMARY_NAV: DashboardNavItem[] = [
  {
    id: "home",
    icon: "home-outline",
    menuIcon: "首",
    label: { zh: "首页", en: "Home", fr: "Accueil" },
  },
  {
    id: "orders",
    icon: "receipt-outline",
    menuIcon: "订",
    visibleForJobRoles: MANAGEMENT_JOB_ROLES,
    label: { zh: "下单", en: "Order", fr: "Commande" },
    compactLabel: { fr: "Achats" },
  },
  {
    id: "store-grade-ranking",
    icon: "trophy-outline",
    menuIcon: "评",
    label: { zh: "评级排行", en: "Grades", fr: "Notes" },
  },
  {
    id: "case-shares",
    icon: "chatbubbles-outline",
    menuIcon: "案",
    label: { zh: "案例", en: "Cases", fr: "Cas" },
  },
  {
    id: "stores",
    icon: "storefront-outline",
    menuIcon: "店",
    visibleForJobRoles: MANAGEMENT_JOB_ROLES,
    label: { zh: "门店", en: "Stores", fr: "Boutiques" },
    compactLabel: { fr: "Sites" },
  },
  {
    id: "training",
    icon: "school-outline",
    menuIcon: "学",
    label: { zh: "培训", en: "Training", fr: "Formation" },
    compactLabel: { fr: "Cours" },
  },
];

export const DASHBOARD_MORE_NAV_GROUPS: DashboardMenuGroup[] = [
  {
    id: "menu",
    label: { zh: "菜单模块", en: "MENU MODULE", fr: "MODULE MENU" },
    items: [
      {
        id: "profile",
        icon: "我",
        label: { zh: "个人资料", en: "Profile", fr: "Profil" },
      },
      {
        id: "training-records",
        icon: "录",
        label: { zh: "培训记录", en: "Training records", fr: "Historique formation" },
      },
      {
        id: "my-case-shares",
        icon: "案",
        label: { zh: "我的案例", en: "My cases", fr: "Mes cas" },
      },
      {
        id: "waiting-queue",
        icon: "队",
        label: { zh: "排队管理", en: "Waiting queue", fr: "File d'attente" },
      },
      {
        id: "recruitment-requests",
        icon: "聘",
        requiredPermission: "recruitment.request.manage",
        visibleForJobRoles: ["store-manager"],
        label: { zh: "招聘请求", en: "Recruitment requests", fr: "Demandes recrutement" },
      },
    ],
  },
];

export const DASHBOARD_COPY = {
  zh: {
    topFamily: "FAMILY",
    topStage: "手机首页",
    languageLabel: "语言",
    greetingLabel: "今日首页",
    greetingPrefix: "你好，",
    greetingFallback: "ZHAO 伙伴",
    greetingSuffix: "。",
    intro: "先看内部资讯，再进入今天的工作模块。",
    newsTitle: "内部资讯",
    newsSearchPlaceholder: "搜索标题、门店、作者或标签",
    newsListLabel: "全部动态",
    newsReadMore: "阅读全文",
    newsAttachment: "附件",
    newsAttachmentOpenError: "附件打开失败，请稍后重试。",
    newsOpenAttachment: "打开附件",
    newsPdfPreview: "PDF 预览",
    newsPdfPreviewLoading: "正在加载 PDF...",
    newsPdfPreviewError: "PDF 预览加载失败，请稍后重试。",
    newsReaderClose: "关闭",
    newsReaderLoading: "正在加载正文...",
    newsConfirmRead: "确认已读",
    newsReadConfirmed: "已确认阅读。",
    newsReadConfirmedAt: "确认时间",
    newsReadConfirmError: "确认阅读失败，请稍后重试。",
    newsReadProgress: (read: number, total: number, rate: number) =>
      `已读 ${read} / ${total}（${rate}%）`,
    newsViewReadDetails: "查看阅读详情",
    newsReadTrackingUnavailable: "此资讯暂无阅读追踪数据。",
    newsReadStatusLoading: "正在加载阅读详情...",
    newsReadStatusError: "阅读详情加载失败，请稍后重试。",
    newsReadList: "已读人员",
    newsUnreadList: "未读人员",
    newsNotRead: "未确认阅读",
    newsMandatoryTitle: "请阅读新资讯",
    newsMandatoryHint: "请浏览到底部后确认阅读。",
    newsNoSearchResult: "当前分类下没有匹配的资讯。",
    readerError: "正文加载失败，可先阅读摘要。",
    newsCategories: {
      news: "资讯",
      congrats: "表彰",
      issues: "批评",
    },
    newsPrevious: "上一篇",
    newsNext: "下一篇",
    newsPosition: "第 {current} / {total} 篇",
    newsVisibility: {
      public: "全员可见",
      management: "管理层可见",
    },
    loadingNews: "正在加载动态...",
    newsError: "动态加载失败，请稍后重试。",
    emptyNews: "当前暂无内部资讯。",
    quickActions: "工作入口",
    moreTitle: "全部入口",
    moreKicker: "ZHAO · MODULES",
    onboarding: "新手引导",
    close: "关闭",
    storeLabel: "门店",
    roleLabel: "岗位",
    logout: "退出登录",
    unavailable: "该模块移动端页面尚未接入。",
  },
  en: {
    topFamily: "FAMILY",
    topStage: "Mobile home",
    languageLabel: "Language",
    greetingLabel: "Today home",
    greetingPrefix: "Hello, ",
    greetingFallback: "ZHAO partner",
    greetingSuffix: ".",
    intro: "Read internal updates first, then jump into today's work.",
    newsTitle: "Internal updates",
    newsSearchPlaceholder: "Search title, store, author or tags",
    newsListLabel: "All updates",
    newsReadMore: "Read more",
    newsAttachment: "Attachment",
    newsAttachmentOpenError: "Attachment could not be opened. Please try again.",
    newsOpenAttachment: "Open attachment",
    newsPdfPreview: "PDF preview",
    newsPdfPreviewLoading: "Loading PDF...",
    newsPdfPreviewError: "PDF preview failed. Please try again.",
    newsReaderClose: "Close",
    newsReaderLoading: "Loading article...",
    newsConfirmRead: "Confirm read",
    newsReadConfirmed: "Reading confirmed.",
    newsReadConfirmedAt: "Confirmed",
    newsReadConfirmError: "Could not confirm reading. Please try again.",
    newsReadProgress: (read: number, total: number, rate: number) =>
      `Read ${read} / ${total} (${rate}%)`,
    newsViewReadDetails: "View reading details",
    newsReadTrackingUnavailable: "No reading tracking data is available for this update.",
    newsReadStatusLoading: "Loading reading details...",
    newsReadStatusError: "Reading details could not be loaded. Please try again.",
    newsReadList: "Read",
    newsUnreadList: "Unread",
    newsNotRead: "Not confirmed",
    newsMandatoryTitle: "Please read this new update",
    newsMandatoryHint: "Scroll to the bottom before confirming that you have read it.",
    newsNoSearchResult: "No matching updates in this category.",
    readerError: "Article could not be loaded. You can still read the summary.",
    newsCategories: {
      news: "News",
      congrats: "Recognition",
      issues: "Critique",
    },
    newsPrevious: "Previous",
    newsNext: "Next",
    newsPosition: "{current} / {total}",
    newsVisibility: {
      public: "All staff",
      management: "Management",
    },
    loadingNews: "Loading updates...",
    newsError: "Updates could not be loaded. Please try again.",
    emptyNews: "No internal updates yet.",
    quickActions: "Work entries",
    moreTitle: "All entries",
    moreKicker: "ZHAO · MODULES",
    onboarding: "Getting started",
    close: "Close",
    storeLabel: "Store",
    roleLabel: "Role",
    logout: "Sign out",
    unavailable: "This mobile module is not connected yet.",
  },
  fr: {
    topFamily: "FAMILY",
    topStage: "Accueil mobile",
    languageLabel: "Langue",
    greetingLabel: "Accueil du jour",
    greetingPrefix: "Bonjour, ",
    greetingFallback: "partenaire ZHAO",
    greetingSuffix: ".",
    intro: "Lisez d'abord les actualités internes, puis passez aux modules du jour.",
    newsTitle: "Actualités internes",
    newsSearchPlaceholder: "Rechercher titre, boutique, auteur ou tags",
    newsListLabel: "Toutes les actualités",
    newsReadMore: "Lire",
    newsAttachment: "Pièce jointe",
    newsAttachmentOpenError: "Ouverture de la piece jointe impossible.",
    newsOpenAttachment: "Ouvrir",
    newsPdfPreview: "Aperçu PDF",
    newsPdfPreviewLoading: "Chargement du PDF...",
    newsPdfPreviewError: "Aperçu PDF impossible. Reessayez plus tard.",
    newsReaderClose: "Fermer",
    newsReaderLoading: "Chargement de l'article...",
    newsConfirmRead: "Confirmer la lecture",
    newsReadConfirmed: "Lecture confirmée.",
    newsReadConfirmedAt: "Confirmée le",
    newsReadConfirmError: "Confirmation de lecture impossible. Réessayez plus tard.",
    newsReadProgress: (read: number, total: number, rate: number) =>
      `Lu ${read} / ${total} (${rate}%)`,
    newsViewReadDetails: "Voir le détail des lectures",
    newsReadTrackingUnavailable: "Aucune donnée de lecture n'est disponible pour cette actualité.",
    newsReadStatusLoading: "Chargement du détail des lectures...",
    newsReadStatusError: "Le détail des lectures n'a pas pu être chargé. Réessayez plus tard.",
    newsReadList: "Ont lu",
    newsUnreadList: "N'ont pas lu",
    newsNotRead: "Non confirmé",
    newsMandatoryTitle: "Veuillez lire cette actualité",
    newsMandatoryHint: "Faites défiler jusqu'en bas avant de confirmer la lecture.",
    newsNoSearchResult: "Aucune actualité correspondante dans cette catégorie.",
    readerError: "Impossible de charger l'article. Le résumé reste disponible.",
    newsCategories: {
      news: "Actualités",
      congrats: "Félicitations",
      issues: "Critiques",
    },
    newsPrevious: "Précédent",
    newsNext: "Suivant",
    newsPosition: "{current} / {total}",
    newsVisibility: {
      public: "Tous les employés",
      management: "Management",
    },
    loadingNews: "Chargement des actualites...",
    newsError: "Les actualites n'ont pas pu charger. Reessayez plus tard.",
    emptyNews: "Aucune actualite interne pour le moment.",
    quickActions: "Entrées de travail",
    moreTitle: "Toutes les entrées",
    moreKicker: "ZHAO · MODULES",
    onboarding: "Guide de démarrage",
    close: "Fermer",
    storeLabel: "Boutique",
    roleLabel: "Poste",
    logout: "Se deconnecter",
    unavailable: "Ce module mobile n'est pas encore connecte.",
  },
};

export type DashboardCopy = (typeof DASHBOARD_COPY)[AuthLanguage];
