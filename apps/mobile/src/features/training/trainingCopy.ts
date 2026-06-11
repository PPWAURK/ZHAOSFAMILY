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
  retry: string;
  markComplete: string;
  markCompleteHintVideo: string;
  markCompleteHintPdf: string;
  markCompleteHintImage: string;
  markCompleteConfirmTitle: string;
  markCompleteConfirmMessage: string;
  markCompleteConfirmCancel: string;
  markCompleteConfirmOk: string;
  progressSyncFailed: string;
  trackingVideo: string;
  trackingPdf: string;
  trackingImage: string;
  tabPlan: string;
  tabAchievements: string;
  quizTag: string;
  startQuiz: string;
  reviewQuiz: string;
  quizGateReady: string;
  quizGateHint: string;
  quiz: string;
  quizKicker: string;
  quizLoading: string;
  quizLoadError: string;
  quizSubmitError: string;
  quizIntro: string;
  quizAttempts: string;
  quizMultipleHint: string;
  quizPassed: string;
  quizFailed: string;
  quizPassMark: string;
  quizTitleUnlocked: string;
  quizSubmit: string;
  quizSubmitting: string;
  quizAnswerAllHint: string;
  quizDone: string;
  quizRetake: string;
  quizNoAttemptsLeft: string;
  myTitles: string;
  titlesEmpty: string;
  titlesLocked: string;
  myRecords: string;
  recordsEmpty: string;
  completedOn: string;
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
    retry: "重试",
    markComplete: "标记完成",
    markCompleteHintVideo: "看完视频 90% 后即可标记完成。",
    markCompleteHintPdf: "阅读到最后一页并稍作停留后即可标记完成。",
    markCompleteHintImage: "查看资料几秒后即可标记完成。",
    markCompleteConfirmTitle: "确认完成？",
    markCompleteConfirmMessage: "确认后该资料将记录为已完成。",
    markCompleteConfirmCancel: "取消",
    markCompleteConfirmOk: "确认完成",
    progressSyncFailed: "进度同步失败，关闭后将自动重试。",
    trackingVideo: "已观看 {watched}%，达到 {required}% 后自动完成。",
    trackingPdf: "已读 {maxPage}/{numPages} 页 · 阅读 {readSeconds}/{requiredSeconds} 秒。",
    trackingImage: "已查看 {seconds} 秒，满 {required} 秒后可标记完成。",
    tabPlan: "培训任务",
    tabAchievements: "我的成就",
    quizTag: "含测验",
    startQuiz: "开始测验",
    reviewQuiz: "重新测验",
    quizGateReady: "学习达标，开始测验完成本资料。",
    quizGateHint: "建议先学习本资料，再开始测验。",
    quiz: "测验",
    quizKicker: "ZHAO · 考核",
    quizLoading: "正在加载测验...",
    quizLoadError: "测验加载失败，请稍后重试。",
    quizSubmitError: "提交失败，请检查网络后重试。",
    quizIntro: "答完全部题目后提交，达到及格分即视为通过。",
    quizAttempts: "已用次数",
    quizMultipleHint: "多选",
    quizPassed: "通过",
    quizFailed: "未通过",
    quizPassMark: "及格线 ",
    quizTitleUnlocked: "🎉 解锁新称号",
    quizSubmit: "提交答卷",
    quizSubmitting: "提交中...",
    quizAnswerAllHint: "请回答所有题目后再提交。",
    quizDone: "完成",
    quizRetake: "重新测验",
    quizNoAttemptsLeft: "已无剩余测验次数。",
    myTitles: "我的称号",
    titlesEmpty: "完成对应岗位的全部必修后即可解锁称号。",
    titlesLocked: "待解锁",
    myRecords: "培训记录",
    recordsEmpty: "还没有已完成的培训。",
    completedOn: "完成于",
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
    retry: "Retry",
    markComplete: "Mark as complete",
    markCompleteHintVideo: "Watch at least 90% of the video to mark it complete.",
    markCompleteHintPdf: "Read to the last page to mark it complete.",
    markCompleteHintImage: "View the material for a few seconds to mark it complete.",
    markCompleteConfirmTitle: "Confirm completion?",
    markCompleteConfirmMessage: "This material will be recorded as completed.",
    markCompleteConfirmCancel: "Cancel",
    markCompleteConfirmOk: "Confirm",
    progressSyncFailed: "Progress sync failed. It will retry when you close.",
    trackingVideo: "Watched {watched}% — completes automatically at {required}%.",
    trackingPdf: "Read {maxPage}/{numPages} pages · {readSeconds}/{requiredSeconds}s.",
    trackingImage: "Viewed for {seconds}s — mark complete after {required}s.",
    tabPlan: "Tasks",
    tabAchievements: "Achievements",
    quizTag: "Quiz",
    startQuiz: "Start quiz",
    reviewQuiz: "Retake quiz",
    quizGateReady: "Material studied — take the quiz to complete it.",
    quizGateHint: "Best to study this material first, then take the quiz.",
    quiz: "Quiz",
    quizKicker: "ZHAO · Assessment",
    quizLoading: "Loading quiz...",
    quizLoadError: "Quiz could not be loaded. Please try again.",
    quizSubmitError: "Submission failed. Check your connection and retry.",
    quizIntro: "Answer all questions, then submit. Reach the pass mark to complete.",
    quizAttempts: "Attempts",
    quizMultipleHint: "multiple",
    quizPassed: "Passed",
    quizFailed: "Not passed",
    quizPassMark: "Pass mark ",
    quizTitleUnlocked: "🎉 New title unlocked",
    quizSubmit: "Submit answers",
    quizSubmitting: "Submitting...",
    quizAnswerAllHint: "Please answer all questions before submitting.",
    quizDone: "Done",
    quizRetake: "Retake quiz",
    quizNoAttemptsLeft: "No attempts left.",
    myTitles: "My titles",
    titlesEmpty: "Complete all required training for a position to unlock its title.",
    titlesLocked: "Locked",
    myRecords: "Training records",
    recordsEmpty: "No completed training yet.",
    completedOn: "Completed",
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
    retry: "Réessayer",
    markComplete: "Marquer comme terminé",
    markCompleteHintVideo: "Regardez au moins 90 % de la vidéo pour la marquer terminée.",
    markCompleteHintPdf: "Lisez jusqu'à la dernière page pour marquer terminé.",
    markCompleteHintImage: "Consultez le support quelques secondes pour marquer terminé.",
    markCompleteConfirmTitle: "Confirmer la fin ?",
    markCompleteConfirmMessage: "Ce support sera enregistré comme terminé.",
    markCompleteConfirmCancel: "Annuler",
    markCompleteConfirmOk: "Confirmer",
    progressSyncFailed: "Échec de la synchronisation. Nouvel essai à la fermeture.",
    trackingVideo: "Visionné {watched} % — terminé automatiquement à {required} %.",
    trackingPdf: "Lu {maxPage}/{numPages} pages · {readSeconds}/{requiredSeconds} s.",
    trackingImage: "Consulté {seconds} s — marquage possible après {required} s.",
    tabPlan: "Tâches",
    tabAchievements: "Réussites",
    quizTag: "Quiz",
    startQuiz: "Démarrer le quiz",
    reviewQuiz: "Refaire le quiz",
    quizGateReady: "Support étudié — passez le quiz pour le terminer.",
    quizGateHint: "Étudiez de préférence ce support, puis passez le quiz.",
    quiz: "Quiz",
    quizKicker: "ZHAO · Évaluation",
    quizLoading: "Chargement du quiz...",
    quizLoadError: "Impossible de charger le quiz. Réessayez plus tard.",
    quizSubmitError: "Échec de l'envoi. Vérifiez la connexion et réessayez.",
    quizIntro: "Répondez à toutes les questions puis validez. Atteignez la note pour terminer.",
    quizAttempts: "Tentatives",
    quizMultipleHint: "choix multiple",
    quizPassed: "Réussi",
    quizFailed: "Échoué",
    quizPassMark: "Seuil ",
    quizTitleUnlocked: "🎉 Nouveau titre débloqué",
    quizSubmit: "Valider les réponses",
    quizSubmitting: "Envoi...",
    quizAnswerAllHint: "Répondez à toutes les questions avant de valider.",
    quizDone: "Terminé",
    quizRetake: "Refaire le quiz",
    quizNoAttemptsLeft: "Plus de tentatives disponibles.",
    myTitles: "Mes titres",
    titlesEmpty: "Terminez toute la formation obligatoire d'un poste pour débloquer son titre.",
    titlesLocked: "À débloquer",
    myRecords: "Historique de formation",
    recordsEmpty: "Aucune formation terminée pour l'instant.",
    completedOn: "Terminé le",
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
