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
  guidedStageIntro: string;
  guidedStageLearning: string;
  guidedStageCompleted: string;
  guidedIntroTitle: string;
  guidedIntroBody: string;
  guidedLearningTitle: string;
  guidedLearningBody: string;
  guidedCompletedTitle: string;
  guidedCompletedBody: string;
  guidedLibraryTitle: string;
  guidedLibraryBody: string;
  guidedJourney: string;
  guidedLibrary: string;
  guidedCurrent: string;
  guidedLocked: string;
  guidedCompleteSeal: string;
  guidedFocusLabel: string;
  guidedStepCounter: string;
  guidedStartJourney: string;
  guidedContinueJourney: string;
  guidedLockedHint: string;
  guidedUnlockHint: string;
  guidedAllRequiredDone: string;
  guidedOptionalReady: string;
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
  hubOverallProgress: string;
  hubRequiredJourney: string;
  hubRequiredJourneyBody: string;
  hubOptionalLibrary: string;
  hubOptionalLibraryBody: string;
  hubAchievements: string;
  hubAchievementsBody: string;
  hubBack: string;
  hubEnter: string;
  hubActionContinue: string;
  hubActionStart: string;
  hubActionDone: string;
  hubMaterialCount: string;
  hubBadgeCount: string;

  // Map-themed strings (three-layer gamified map)
  mapLayerShared: string;
  mapLayerRequired: string;
  mapLayerAdvanced: string;
  mapLayerSharedBody: string;
  mapLayerRequiredBody: string;
  mapLayerAdvancedBody: string;
  mapLocked: string;
  mapUnlockNext: string;
  mapUnlockCondition: string;
  mapNodeStudy: string;
  mapNodeQuiz: string;
  mapNodeComplete: string;
  mapPositionGate: string;
  mapAchievementEntry: string;
  backToMap: string;

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
    guidedStageIntro: "启程",
    guidedStageLearning: "研习中",
    guidedStageCompleted: "已钤印",
    guidedIntroTitle: "先走完这条必修之路",
    guidedIntroBody: "浏览岗位必修资料，按自己的节奏学习。完成测验即可获得认证。",
    guidedLearningTitle: "沿着朱印路径继续",
    guidedLearningBody: "随时查阅必修资料，按自己的节奏学习。选修资料也可随时打开。",
    guidedCompletedTitle: "必修旅程已完成",
    guidedCompletedBody:
      "全部必修已完成，称号与记录会继续同步。现在可回看资料或继续选修内容。",
    guidedLibraryTitle: "岗位资料库",
    guidedLibraryBody:
      "当前没有必修顺序要求，可直接进入资料库学习与回看。",
    guidedJourney: "朱印路径",
    guidedLibrary: "选修资料库",
    guidedCurrent: "进行中",
    guidedLocked: "未解锁",
    guidedCompleteSeal: "已钤印",
    guidedFocusLabel: "本次先看这一步",
    guidedStepCounter: "第 {current} / {total} 步",
    guidedStartJourney: "开始第一步",
    guidedContinueJourney: "继续当前步骤",
    guidedLockedHint: "完成前一步后解锁",
    guidedUnlockHint: "随时可以打开任何资料学习。",
    guidedAllRequiredDone: "必修已全部完成",
    guidedOptionalReady: "选修资料仍可随时打开",
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
    hubOverallProgress: "整体进度",
    hubRequiredJourney: "朱印必修",
    hubRequiredJourneyBody: "完成岗位必修资料，随时可按自己节奏学习",
    hubOptionalLibrary: "选修资料库",
    hubOptionalLibraryBody: "随时查阅岗位补充资料",
    hubAchievements: "我的成就",
    hubAchievementsBody: "查看已解锁称号与培训记录",
    hubBack: "返回",
    hubEnter: "进入",
    hubActionContinue: "继续学习",
    hubActionStart: "开始旅程",
    hubActionDone: "已完成",
    hubMaterialCount: "{count} 份资料",
    hubBadgeCount: "{count} 个称号",
    mapLayerShared: "全员共享",
    mapLayerRequired: "岗位必修",
    mapLayerAdvanced: "高阶课程",
    mapLayerSharedBody: "所有员工必须学习的全员材料",
    mapLayerRequiredBody: "你所在岗位的必修培训内容",
    mapLayerAdvancedBody: "完成岗位必修后可探索的高阶内容",
    mapLocked: "未解锁",
    mapUnlockNext: "完成本层全部内容后解锁",
    mapUnlockCondition: "完成全部必修即可解锁高阶课程",
    mapNodeStudy: "学习",
    mapNodeQuiz: "测验",
    mapNodeComplete: "已完成",
    mapPositionGate: "按岗位展开",
    mapAchievementEntry: "成就 & 称号",
    backToMap: "返回闯关地图",
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
    guidedStageIntro: "Begins",
    guidedStageLearning: "In study",
    guidedStageCompleted: "Sealed",
    guidedIntroTitle: "Take the required path in order",
    guidedIntroBody:
      "Browse the required materials for your role and learn at your own pace. Pass the quiz to get certified.",
    guidedLearningTitle: "Continue along the red-seal path",
    guidedLearningBody:
      "Browse required materials anytime and learn at your own pace. Optional materials are also always available.",
    guidedCompletedTitle: "Required journey completed",
    guidedCompletedBody:
      "All required training is done. Titles and records will keep syncing while you revisit materials or continue with optional study.",
    guidedLibraryTitle: "Role library",
    guidedLibraryBody:
      "There is no required sequence right now, so you can enter the library directly to study or revisit materials.",
    guidedJourney: "Red-seal journey",
    guidedLibrary: "Optional library",
    guidedCurrent: "Current",
    guidedLocked: "Locked",
    guidedCompleteSeal: "Stamped",
    guidedFocusLabel: "Focus on this step now",
    guidedStepCounter: "Step {current} / {total}",
    guidedStartJourney: "Start step one",
    guidedContinueJourney: "Continue current step",
    guidedLockedHint: "Unlocks after the step before it",
    guidedUnlockHint: "You can open any material to learn at any time.",
    guidedAllRequiredDone: "All required steps complete",
    guidedOptionalReady: "Optional materials are always available",
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
    hubOverallProgress: "Overall progress",
    hubRequiredJourney: "Required journey",
    hubRequiredJourneyBody: "Complete required materials for your role at your own pace",
    hubOptionalLibrary: "Optional library",
    hubOptionalLibraryBody: "Browse supplementary materials anytime",
    hubAchievements: "My achievements",
    hubAchievementsBody: "View unlocked titles and training records",
    hubBack: "Back",
    hubEnter: "Enter",
    hubActionContinue: "Continue",
    hubActionStart: "Start journey",
    hubActionDone: "Completed",
    hubMaterialCount: "{count} materials",
    hubBadgeCount: "{count} titles",
    mapLayerShared: "Shared",
    mapLayerRequired: "Required",
    mapLayerAdvanced: "Advanced",
    mapLayerSharedBody: "Mandatory materials for all employees",
    mapLayerRequiredBody: "Position-specific required training",
    mapLayerAdvancedBody: "Advanced courses after completing required training",
    mapLocked: "Locked",
    mapUnlockNext: "Complete all items in this layer to unlock the next",
    mapUnlockCondition: "Complete all required courses to unlock advanced",
    mapNodeStudy: "Study",
    mapNodeQuiz: "Quiz",
    mapNodeComplete: "Done",
    mapPositionGate: "Expand by position",
    mapAchievementEntry: "Achievements & Titles",
    backToMap: "Back to Training Map",
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
    guidedStageIntro: "Départ",
    guidedStageLearning: "En étude",
    guidedStageCompleted: "Scellé",
    guidedIntroTitle: "Suivez d'abord le parcours obligatoire",
    guidedIntroBody:
      "Parcourez les supports obligatoires de votre poste et apprenez à votre rythme. Réussissez le quiz pour être certifié.",
    guidedLearningTitle: "Continuez sur le parcours au sceau rouge",
    guidedLearningBody:
      "Consultez les supports obligatoires à tout moment et apprenez à votre rythme. Les supports optionnels sont également toujours disponibles.",
    guidedCompletedTitle: "Parcours obligatoire terminé",
    guidedCompletedBody:
      "Toute la formation obligatoire est terminée. Les titres et l'historique continuent à se synchroniser pendant que vous révisez ou poursuivez les supports optionnels.",
    guidedLibraryTitle: "Bibliothèque du poste",
    guidedLibraryBody:
      "Aucune séquence obligatoire n'est requise pour le moment ; vous pouvez donc entrer directement dans la bibliothèque pour apprendre ou réviser.",
    guidedJourney: "Parcours au sceau rouge",
    guidedLibrary: "Bibliothèque optionnelle",
    guidedCurrent: "En cours",
    guidedLocked: "Verrouillé",
    guidedCompleteSeal: "Scellé",
    guidedFocusLabel: "Commencez par cette étape",
    guidedStepCounter: "Étape {current} / {total}",
    guidedStartJourney: "Commencer la première étape",
    guidedContinueJourney: "Continuer l'étape en cours",
    guidedLockedHint: "Se débloque après l'étape précédente",
    guidedUnlockHint:
      "Vous pouvez ouvrir n'importe quel support pour apprendre à tout moment.",
    guidedAllRequiredDone: "Toutes les étapes obligatoires sont terminées",
    guidedOptionalReady: "Les supports optionnels restent disponibles",
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
    hubOverallProgress: "Progression globale",
    hubRequiredJourney: "Parcours obligatoire",
    hubRequiredJourneyBody: "Complétez les supports obligatoires de votre poste à votre rythme",
    hubOptionalLibrary: "Bibliothèque optionnelle",
    hubOptionalLibraryBody: "Consultez les supports complémentaires à tout moment",
    hubAchievements: "Mes réussites",
    hubAchievementsBody: "Consultez vos titres débloqués et votre historique",
    hubBack: "Retour",
    hubEnter: "Entrer",
    hubActionContinue: "Continuer",
    hubActionStart: "Commencer",
    hubActionDone: "Terminé",
    hubMaterialCount: "{count} supports",
    hubBadgeCount: "{count} titres",
    mapLayerShared: "Partagé",
    mapLayerRequired: "Obligatoire",
    mapLayerAdvanced: "Avancé",
    mapLayerSharedBody: "Supports obligatoires pour tous les employés",
    mapLayerRequiredBody: "Formation obligatoire spécifique au poste",
    mapLayerAdvancedBody: "Cours avancés après avoir terminé la formation obligatoire",
    mapLocked: "Verrouillé",
    mapUnlockNext: "Terminez tous les éléments de ce niveau pour débloquer le suivant",
    mapUnlockCondition: "Terminez tous les cours obligatoires pour débloquer le niveau avancé",
    mapNodeStudy: "Étudier",
    mapNodeQuiz: "Quiz",
    mapNodeComplete: "Terminé",
    mapPositionGate: "Déplier par poste",
    mapAchievementEntry: "Réussites & Titres",
    backToMap: "Retour à la carte",
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
