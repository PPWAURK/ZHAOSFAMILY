import type { AuthLanguage } from "@/features/auth/authCopy";
import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { HEADQUARTER_JOB_ROLES, MANAGEMENT_JOB_ROLES } from "@zhao/utils";

export type DashboardPrimaryIconName = ComponentProps<typeof Ionicons>["name"];

export type DashboardNavItem = {
  id: string;
  href?: string;
  icon: DashboardPrimaryIconName;
  menuIcon: string;
  requiredPermission?: string;
  visibleForJobRoles?: readonly string[];
  label: Record<AuthLanguage, string>;
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
    id: "stores",
    icon: "storefront-outline",
    menuIcon: "店",
    visibleForJobRoles: MANAGEMENT_JOB_ROLES,
    label: { zh: "门店", en: "Stores", fr: "Boutiques" },
  },
  {
    id: "orders",
    icon: "receipt-outline",
    menuIcon: "订",
    visibleForJobRoles: MANAGEMENT_JOB_ROLES,
    label: { zh: "下单", en: "Order", fr: "Commande" },
  },
  {
    id: "training",
    icon: "school-outline",
    menuIcon: "学",
    label: { zh: "培训", en: "Training", fr: "Formation" },
  },
  {
    id: "more",
    icon: "ellipsis-horizontal",
    menuIcon: "···",
    label: { zh: "更多", en: "More", fr: "Plus" },
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
        id: "permissions",
        icon: "权",
        requiredPermission: "system.permission.manage",
        visibleForJobRoles: ["holding"],
        label: { zh: "权限中心", en: "Permissions", fr: "Permissions" },
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
  {
    id: "learning",
    label: { zh: "学习模块", en: "LEARNING MODULE", fr: "MODULE FORMATION" },
    items: [
      {
        id: "training-certifications",
        icon: "证",
        label: { zh: "认证管理", en: "Certifications", fr: "Certifications" },
      },
      {
        id: "training-materials",
        icon: "资",
        label: { zh: "学习资料", en: "Learning materials", fr: "Ressources" },
      },
      {
        id: "training-positions",
        icon: "岗",
        requiredPermission: "training.position.manage",
        visibleForJobRoles: HEADQUARTER_JOB_ROLES,
        label: { zh: "岗位管理", en: "Positions", fr: "Postes" },
      },
    ],
  },
  {
    id: "orders",
    label: { zh: "订单模块", en: "ORDER MODULE", fr: "MODULE COMMANDES" },
    items: [
      {
        id: "suppliers",
        icon: "供",
        visibleForJobRoles: MANAGEMENT_JOB_ROLES,
        label: { zh: "供应商管理", en: "Suppliers", fr: "Fournisseurs" },
      },
      {
        id: "inventory",
        icon: "库",
        visibleForJobRoles: HEADQUARTER_JOB_ROLES,
        label: { zh: "ZHAO Bureau 库存", en: "ZHAO Bureau stock", fr: "Stock ZHAO Bureau" },
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
    newsNoSearchResult: "当前分类下没有匹配的资讯。",
    readerError: "正文加载失败，可先阅读摘要。",
    newsCategories: {
      news: "最新动态",
      congrats: "表彰快讯",
      issues: "运营提醒",
    },
    loadingNews: "正在加载动态...",
    newsError: "动态加载失败，请稍后重试。",
    emptyNews: "当前暂无内部资讯。",
    quickActions: "工作入口",
    moreTitle: "全部入口",
    moreKicker: "ZHAO · MODULES",
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
    newsNoSearchResult: "No matching updates in this category.",
    readerError: "Article could not be loaded. You can still read the summary.",
    newsCategories: {
      news: "Latest news",
      congrats: "Recognition",
      issues: "Operational alerts",
    },
    loadingNews: "Loading updates...",
    newsError: "Updates could not be loaded. Please try again.",
    emptyNews: "No internal updates yet.",
    quickActions: "Work entries",
    moreTitle: "All entries",
    moreKicker: "ZHAO · MODULES",
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
    newsNoSearchResult: "Aucune actualité correspondante dans cette catégorie.",
    readerError: "Impossible de charger l'article. Le résumé reste disponible.",
    newsCategories: {
      news: "Nouvelles",
      congrats: "Mises à l'honneur",
      issues: "Alertes opérationnelles",
    },
    loadingNews: "Chargement des actualites...",
    newsError: "Les actualites n'ont pas pu charger. Reessayez plus tard.",
    emptyNews: "Aucune actualite interne pour le moment.",
    quickActions: "Entrées de travail",
    moreTitle: "Toutes les entrées",
    moreKicker: "ZHAO · MODULES",
    close: "Fermer",
    storeLabel: "Boutique",
    roleLabel: "Poste",
    logout: "Se deconnecter",
    unavailable: "Ce module mobile n'est pas encore connecte.",
  },
};
