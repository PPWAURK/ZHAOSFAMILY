import type { AuthLanguage } from "@/features/auth/authCopy";

type TrainingCopy = {
  title: string;
  kicker: string;
  intro: string;
  loading: string;
  error: string;
  empty: string;
  refresh: string;
  required: string;
  optional: string;
  completed: string;
  progress: string;
  positions: string;
  requiredDone: string;
  open: string;
  close: string;
  previewLoading: string;
  previewError: string;
  openError: string;
  materialTypes: Record<string, string>;
  statuses: Record<string, string>;
  positionLabels: Record<string, string>;
};

export const TRAINING_COPY: Record<AuthLanguage, TrainingCopy> = {
  zh: {
    title: "我的培训任务",
    kicker: "ZHAO · 培训空间",
    intro: "根据你的岗位自动汇总：全员共享、前厅/后厨共享和具体岗位培训。",
    loading: "正在加载培训任务...",
    error: "培训任务加载失败，请稍后重试。",
    empty: "暂时没有培训任务。",
    refresh: "刷新",
    required: "必修",
    optional: "选修",
    completed: "已完成",
    progress: "完成率",
    positions: "匹配岗位",
    requiredDone: "必修完成",
    open: "打开学习",
    close: "关闭",
    previewLoading: "正在打开学习内容...",
    previewError: "学习内容加载失败，请稍后重试。",
    openError: "学习内容打不开，请稍后重试。",
    materialTypes: {
      VIDEO: "视频",
      PDF: "PDF",
      QUIZ: "测验",
      ARTICLE: "文章",
      IMAGE: "图片",
      OTHER: "资料",
    },
    statuses: {
      not_started: "未开始",
      in_progress: "学习中",
      completed: "已完成",
    },
    positionLabels: {
      ALL: "全员共享",
      FOH: "前厅共享",
      BOH: "后厨共享",
      FRONT_HOST: "迎宾",
      FRONT_CASHIER: "收银",
      FRONT_SERVER: "服务生",
      FRONT_PACKER: "打包",
      FRONT_BAR: "吧台",
      BACK_DISHWASHER: "洗碗",
      BACK_NOODLE: "打面",
      BACK_HOT_APPETIZER: "热前菜",
      BACK_COLD_APPETIZER: "冷前菜",
      BACK_RICE: "饭",
      SM: "店长",
      RM: "区域经理",
      HOLDING: "总部",
    },
  },
  en: {
    title: "My training tasks",
    kicker: "ZHAO · Training space",
    intro: "Built from your positions: all-team, department-shared, and role-specific training.",
    loading: "Loading training tasks...",
    error: "Training tasks could not be loaded. Please try again.",
    empty: "No training tasks yet.",
    refresh: "Refresh",
    required: "Required",
    optional: "Optional",
    completed: "Completed",
    progress: "Progress",
    positions: "Matched positions",
    requiredDone: "Required done",
    open: "Open",
    close: "Close",
    previewLoading: "Opening material...",
    previewError: "Material could not be loaded. Please try again.",
    openError: "Material could not be opened. Please try again.",
    materialTypes: {
      VIDEO: "Video",
      PDF: "PDF",
      QUIZ: "Quiz",
      ARTICLE: "Article",
      IMAGE: "Image",
      OTHER: "Material",
    },
    statuses: {
      not_started: "Not started",
      in_progress: "In progress",
      completed: "Completed",
    },
    positionLabels: {
      ALL: "All positions",
      FOH: "Front shared",
      BOH: "Kitchen shared",
      FRONT_HOST: "Host",
      FRONT_CASHIER: "Cashier",
      FRONT_SERVER: "Server",
      FRONT_PACKER: "Packing",
      FRONT_BAR: "Bar",
      BACK_DISHWASHER: "Dishwasher",
      BACK_NOODLE: "Noodle station",
      BACK_HOT_APPETIZER: "Hot appetizers",
      BACK_COLD_APPETIZER: "Cold appetizers",
      BACK_RICE: "Rice station",
      SM: "Store manager",
      RM: "Regional manager",
      HOLDING: "Holding",
    },
  },
  fr: {
    title: "Mes tâches formation",
    kicker: "ZHAO · Espace formation",
    intro: "Construit selon vos postes : commun, partagé par équipe et spécifique au poste.",
    loading: "Chargement des tâches...",
    error: "Impossible de charger la formation. Réessayez plus tard.",
    empty: "Aucune tâche formation pour le moment.",
    refresh: "Actualiser",
    required: "Obligatoire",
    optional: "Optionnel",
    completed: "Terminé",
    progress: "Progression",
    positions: "Postes liés",
    requiredDone: "Obligatoires faits",
    open: "Ouvrir",
    close: "Fermer",
    previewLoading: "Ouverture du support...",
    previewError: "Impossible de charger le support. Réessayez plus tard.",
    openError: "Impossible d'ouvrir le support. Réessayez plus tard.",
    materialTypes: {
      VIDEO: "Vidéo",
      PDF: "PDF",
      QUIZ: "Quiz",
      ARTICLE: "Article",
      IMAGE: "Image",
      OTHER: "Support",
    },
    statuses: {
      not_started: "Non commencé",
      in_progress: "En cours",
      completed: "Terminé",
    },
    positionLabels: {
      ALL: "Tous les postes",
      FOH: "Salle partagée",
      BOH: "Cuisine partagée",
      FRONT_HOST: "Accueil",
      FRONT_CASHIER: "Caisse",
      FRONT_SERVER: "Serveur",
      FRONT_PACKER: "Emballage",
      FRONT_BAR: "Bar",
      BACK_DISHWASHER: "Plonge",
      BACK_NOODLE: "Nouilles",
      BACK_HOT_APPETIZER: "Entrées chaudes",
      BACK_COLD_APPETIZER: "Entrées froides",
      BACK_RICE: "Riz",
      SM: "Responsable boutique",
      RM: "Responsable régional",
      HOLDING: "Holding",
    },
  },
};
