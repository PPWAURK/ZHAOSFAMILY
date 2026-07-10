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
  badgeUnlockedKicker: string;
  badgeUnlockedTitle: string;
  badgeUnlockedIntro: string;
  badgeUnlockedReasonSummary: string;
  badgeUnlockedDetails: string;
  badgeUnlockedHideDetails: string;
  badgeUnlockedClose: string;
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
  hubActionContinue: string;
  hubActionStart: string;
  hubActionDone: string;
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

  materialTypes: Record<string, string>;
  statuses: Record<string, string>;
  positionLabels: Record<string, string>;
};

export const TRAINING_COPY: Record<AuthLanguage, TrainingCopy> = {
  zh: {
    title: "我的学习任务",
    kicker: "ZHAO · 培训中心",
    intro: "这里会根据你的岗位，自动安排你需要学习的内容。",
    loading: "正在加载学习任务…",
    error: "学习任务加载失败，请稍后再试。",
    empty: "暂时没有需要学习的内容。",
    refresh: "刷新",
    required: "必须学习",
    optional: "可以看看",
    completed: "已完成",
    progress: "学习进度",
    positions: "适用岗位",
    requiredDone: "必学完成",
    guidedStageIntro: "准备开始",
    guidedStageLearning: "正在学习",
    guidedStageCompleted: "已完成",
    guidedIntroTitle: "先完成你的必学内容",
    guidedIntroBody: "按照步骤学习岗位必修资料。学完后完成测验，就可以获得对应认证。",
    guidedLearningTitle: "继续完成当前学习",
    guidedLearningBody: "先完成当前步骤，再解锁下一步。其他可选资料也可以随时查看。",
    guidedCompletedTitle: "必学内容已完成",
    guidedCompletedBody: "你已经完成了当前岗位的必学内容。可以回看资料，也可以继续学习进阶内容。",
    guidedLibraryTitle: "学习资料库",
    guidedLibraryBody: "这里可以查看与你岗位相关的学习资料，也可以随时回看已学内容。",
    guidedJourney: "学习路线",
    guidedLibrary: "资料库",
    guidedCurrent: "当前步骤",
    guidedLocked: "未解锁",
    guidedCompleteSeal: "已完成",
    guidedFocusLabel: "建议先完成",
    guidedStepCounter: "第 {current} / {total} 步",
    guidedStartJourney: "开始学习",
    guidedContinueJourney: "继续学习",
    guidedLockedHint: "完成前一步后解锁",
    guidedUnlockHint: "资料可以随时打开学习。",
    guidedAllRequiredDone: "必学内容已全部完成",
    guidedOptionalReady: "你还可以继续查看可选资料",
    open: "开始学习",
    close: "关闭",
    previewLoading: "正在打开学习内容…",
    previewError: "学习内容加载失败，请稍后再试。",
    openError: "学习内容打不开，请稍后再试。",
    retry: "重试",
    markComplete: "标记为已学完",
    markCompleteHintVideo: "观看视频达到要求后，即可完成本资料。",
    markCompleteHintPdf: "阅读到最后一页后，即可完成本资料。",
    markCompleteHintImage: "查看图片资料几秒后，即可完成本资料。",
    markCompleteConfirmTitle: "确认已学完？",
    markCompleteConfirmMessage: "确认后，这份资料会记录为已完成。",
    markCompleteConfirmCancel: "取消",
    markCompleteConfirmOk: "确认完成",
    progressSyncFailed: "进度同步失败，关闭后会自动重试。",
    trackingVideo: "已观看 {watched}%，达到 {required}% 后自动完成。",
    trackingPdf: "已阅读 {maxPage}/{numPages} 页 · 已停留 {readSeconds}/{requiredSeconds} 秒。",
    trackingImage: "已查看 {seconds} 秒，达到 {required} 秒后可完成。",
    tabPlan: "学习任务",
    tabAchievements: "我的成果",
    quizTag: "需要测验",
    startQuiz: "开始测验",
    reviewQuiz: "重新测验",
    quizGateReady: "学习已达标，现在可以开始测验。",
    quizGateHint: "建议先学完资料，再开始测验。",
    quiz: "测验",
    quizKicker: "ZHAO · 学习测验",
    quizLoading: "正在加载测验…",
    quizLoadError: "测验加载失败，请稍后再试。",
    quizSubmitError: "提交失败，请检查网络后重试。",
    quizIntro: "请完成所有题目。达到及格分后，这项学习会标记为完成。",
    quizAttempts: "已用次数",
    quizMultipleHint: "可多选",
    quizPassed: "已通过",
    quizFailed: "未通过",
    quizPassMark: "及格分 ",
    quizTitleUnlocked: "🎉 已获得新称号",
    badgeUnlockedKicker: "ZHAO · 徽章解锁",
    badgeUnlockedTitle: "恭喜获得新徽章",
    badgeUnlockedIntro: "这份学习成果已记录到你的个人档案。",
    badgeUnlockedReasonSummary: "完成 {count} 项必修学习后获得",
    badgeUnlockedDetails: "查看完成详情",
    badgeUnlockedHideDetails: "收起完成详情",
    badgeUnlockedClose: "收下徽章",
    quizSubmit: "提交答案",
    quizSubmitting: "正在提交…",
    quizAnswerAllHint: "请先回答所有题目。",
    quizDone: "完成",
    quizRetake: "重新测验",
    quizNoAttemptsLeft: "测验次数已用完。",
    myTitles: "我的称号",
    titlesEmpty: "完成岗位必学内容后，就可以解锁对应称号。",
    titlesLocked: "未解锁",
    myRecords: "学习记录",
    recordsEmpty: "还没有完成的学习记录。",
    completedOn: "完成于",
    hubOverallProgress: "总进度",
    hubActionContinue: "继续学习",
    hubActionStart: "开始学习",
    hubActionDone: "已完成",
    mapLayerShared: "全员必学",
    mapLayerRequired: "岗位必学",
    mapLayerAdvanced: "进阶学习",
    mapLayerSharedBody: "所有员工都需要学习的基础内容",
    mapLayerRequiredBody: "根据你的岗位安排的必学内容",
    mapLayerAdvancedBody: "完成必学后，可以继续学习更高阶内容",
    mapLocked: "未解锁",
    mapUnlockNext: "完成本层内容后解锁下一层",
    mapUnlockCondition: "完成全部必学内容后解锁进阶学习",
    mapNodeStudy: "学习",
    mapNodeQuiz: "测验",
    mapNodeComplete: "完成",
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
      ALL: "全员",
      FOH: "前厅",
      BOH: "后厨",
      FRONT_HOST: "迎宾",
      FRONT_CASHIER: "收银",
      FRONT_SERVER: "服务员",
      FRONT_PACKER: "打包",
      FRONT_BAR: "吧台",
      BACK_DISHWASHER: "洗碗",
      BACK_NOODLE: "打面",
      BACK_HOT_APPETIZER: "热前菜",
      BACK_COLD_APPETIZER: "冷前菜",
      BACK_RICE: "米饭",
      SM: "店长",
      RM: "区域经理",
      HOLDING: "总部",
    },
  },

  en: {
    title: "My learning tasks",
    kicker: "ZHAO · Training Center",
    intro: "Your learning plan is built automatically from your position.",
    loading: "Loading learning tasks…",
    error: "Could not load your learning tasks. Please try again later.",
    empty: "No learning tasks for now.",
    refresh: "Refresh",
    required: "Must learn",
    optional: "Optional",
    completed: "Completed",
    progress: "Progress",
    positions: "For positions",
    requiredDone: "Required done",
    guidedStageIntro: "Ready to start",
    guidedStageLearning: "Learning",
    guidedStageCompleted: "Completed",
    guidedIntroTitle: "Start with your required learning",
    guidedIntroBody:
      "Follow the steps for your position. After learning, pass the quiz to get certified.",
    guidedLearningTitle: "Continue your current step",
    guidedLearningBody:
      "Finish the current step to unlock the next one. Optional materials are always available.",
    guidedCompletedTitle: "Required learning completed",
    guidedCompletedBody:
      "You have completed the required learning for this position. You can review materials or continue with advanced learning.",
    guidedLibraryTitle: "Learning library",
    guidedLibraryBody:
      "Find materials linked to your position here. You can also come back anytime to review them.",
    guidedJourney: "Learning path",
    guidedLibrary: "Library",
    guidedCurrent: "Current step",
    guidedLocked: "Locked",
    guidedCompleteSeal: "Completed",
    guidedFocusLabel: "Start here",
    guidedStepCounter: "Step {current} / {total}",
    guidedStartJourney: "Start learning",
    guidedContinueJourney: "Continue learning",
    guidedLockedHint: "Unlocks after the previous step",
    guidedUnlockHint: "You can open materials anytime.",
    guidedAllRequiredDone: "All required learning is done",
    guidedOptionalReady: "You can still view optional materials",
    open: "Start learning",
    close: "Close",
    previewLoading: "Opening learning content…",
    previewError: "Could not load this content. Please try again later.",
    openError: "Could not open this content. Please try again later.",
    retry: "Retry",
    markComplete: "Mark as learned",
    markCompleteHintVideo: "Watch the required part of the video to complete this material.",
    markCompleteHintPdf: "Read to the last page to complete this material.",
    markCompleteHintImage: "View the image for a few seconds to complete this material.",
    markCompleteConfirmTitle: "Mark as learned?",
    markCompleteConfirmMessage: "This material will be saved as completed.",
    markCompleteConfirmCancel: "Cancel",
    markCompleteConfirmOk: "Confirm",
    progressSyncFailed: "Progress sync failed. It will retry after closing.",
    trackingVideo: "Watched {watched}%. It completes automatically at {required}%.",
    trackingPdf: "Read {maxPage}/{numPages} pages · stayed {readSeconds}/{requiredSeconds}s.",
    trackingImage: "Viewed for {seconds}s. Complete after {required}s.",
    tabPlan: "Learning tasks",
    tabAchievements: "My results",
    quizTag: "Quiz needed",
    startQuiz: "Start quiz",
    reviewQuiz: "Retake quiz",
    quizGateReady: "Learning target reached. You can start the quiz now.",
    quizGateHint: "Please study the material first, then take the quiz.",
    quiz: "Quiz",
    quizKicker: "ZHAO · Learning quiz",
    quizLoading: "Loading quiz…",
    quizLoadError: "Could not load the quiz. Please try again later.",
    quizSubmitError: "Submission failed. Check your connection and try again.",
    quizIntro:
      "Answer all questions. If you reach the pass mark, this learning item will be completed.",
    quizAttempts: "Attempts used",
    quizMultipleHint: "Multiple answers",
    quizPassed: "Passed",
    quizFailed: "Not passed",
    quizPassMark: "Pass mark ",
    quizTitleUnlocked: "🎉 New title unlocked",
    badgeUnlockedKicker: "ZHAO · BADGE UNLOCKED",
    badgeUnlockedTitle: "You earned a new badge",
    badgeUnlockedIntro: "This learning achievement is now recorded in your profile.",
    badgeUnlockedReasonSummary: "Earned after completing {count} required items",
    badgeUnlockedDetails: "View completed items",
    badgeUnlockedHideDetails: "Hide completed items",
    badgeUnlockedClose: "Collect badge",
    quizSubmit: "Submit answers",
    quizSubmitting: "Submitting…",
    quizAnswerAllHint: "Please answer all questions first.",
    quizDone: "Done",
    quizRetake: "Retake quiz",
    quizNoAttemptsLeft: "No quiz attempts left.",
    myTitles: "My titles",
    titlesEmpty: "Complete all required learning for a position to unlock its title.",
    titlesLocked: "Locked",
    myRecords: "Learning records",
    recordsEmpty: "No completed learning records yet.",
    completedOn: "Completed on",
    hubOverallProgress: "Total progress",
    hubActionContinue: "Continue learning",
    hubActionStart: "Start learning",
    hubActionDone: "Completed",
    mapLayerShared: "All-team basics",
    mapLayerRequired: "Position training",
    mapLayerAdvanced: "Advanced learning",
    mapLayerSharedBody: "Basic learning required for everyone",
    mapLayerRequiredBody: "Required learning based on your position",
    mapLayerAdvancedBody: "More advanced content after required learning",
    mapLocked: "Locked",
    mapUnlockNext: "Complete this level to unlock the next one",
    mapUnlockCondition: "Complete all required learning to unlock advanced learning",
    mapNodeStudy: "Study",
    mapNodeQuiz: "Quiz",
    mapNodeComplete: "Done",
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
      in_progress: "Learning",
      completed: "Completed",
    },
    positionLabels: {
      ALL: "Everyone",
      FOH: "Front of house",
      BOH: "Kitchen",
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
      HOLDING: "Head office",
    },
  },

  fr: {
    title: "Mes formations",
    kicker: "ZHAO · Centre de formation",
    intro: "Votre parcours est préparé automatiquement selon votre poste.",
    loading: "Chargement des formations…",
    error: "Impossible de charger vos formations. Réessayez plus tard.",
    empty: "Aucune formation à faire pour le moment.",
    refresh: "Actualiser",
    required: "À faire",
    optional: "En plus",
    completed: "Terminé",
    progress: "Progression",
    positions: "Pour les postes",
    requiredDone: "Obligatoire terminé",
    guidedStageIntro: "Prêt à commencer",
    guidedStageLearning: "En cours",
    guidedStageCompleted: "Terminé",
    guidedIntroTitle: "Commencez par vos formations obligatoires",
    guidedIntroBody:
      "Suivez les étapes prévues pour votre poste. Après la formation, réussissez le quiz pour valider.",
    guidedLearningTitle: "Continuez l’étape en cours",
    guidedLearningBody:
      "Terminez l’étape actuelle pour débloquer la suivante. Les contenus en plus restent disponibles.",
    guidedCompletedTitle: "Formations obligatoires terminées",
    guidedCompletedBody:
      "Vous avez terminé les formations obligatoires de ce poste. Vous pouvez revoir les supports ou continuer avec des contenus avancés.",
    guidedLibraryTitle: "Bibliothèque de formation",
    guidedLibraryBody:
      "Retrouvez ici les supports liés à votre poste. Vous pouvez les consulter à tout moment.",
    guidedJourney: "Parcours de formation",
    guidedLibrary: "Bibliothèque",
    guidedCurrent: "Étape en cours",
    guidedLocked: "Verrouillé",
    guidedCompleteSeal: "Terminé",
    guidedFocusLabel: "Commencez ici",
    guidedStepCounter: "Étape {current} / {total}",
    guidedStartJourney: "Commencer",
    guidedContinueJourney: "Continuer",
    guidedLockedHint: "Débloqué après l’étape précédente",
    guidedUnlockHint: "Vous pouvez ouvrir les supports à tout moment.",
    guidedAllRequiredDone: "Toutes les formations obligatoires sont terminées",
    guidedOptionalReady: "Vous pouvez encore consulter les contenus en plus",
    open: "Commencer",
    close: "Fermer",
    previewLoading: "Ouverture du contenu…",
    previewError: "Impossible de charger ce contenu. Réessayez plus tard.",
    openError: "Impossible d’ouvrir ce contenu. Réessayez plus tard.",
    retry: "Réessayer",
    markComplete: "Marquer comme appris",
    markCompleteHintVideo: "Regardez la partie demandée de la vidéo pour terminer ce support.",
    markCompleteHintPdf: "Lisez jusqu’à la dernière page pour terminer ce support.",
    markCompleteHintImage: "Consultez l’image quelques secondes pour terminer ce support.",
    markCompleteConfirmTitle: "Marquer comme appris ?",
    markCompleteConfirmMessage: "Ce support sera enregistré comme terminé.",
    markCompleteConfirmCancel: "Annuler",
    markCompleteConfirmOk: "Confirmer",
    progressSyncFailed: "La progression n’a pas été synchronisée. Un nouvel essai sera fait à la fermeture.",
    trackingVideo: "Visionné {watched} %. Terminé automatiquement à {required} %.",
    trackingPdf: "Lu {maxPage}/{numPages} pages · {readSeconds}/{requiredSeconds} s.",
    trackingImage: "Consulté {seconds} s. Terminé après {required} s.",
    tabPlan: "Formations",
    tabAchievements: "Mes résultats",
    quizTag: "Quiz à faire",
    startQuiz: "Commencer le quiz",
    reviewQuiz: "Refaire le quiz",
    quizGateReady: "Formation assez avancée. Vous pouvez commencer le quiz.",
    quizGateHint: "Étudiez d’abord le support, puis faites le quiz.",
    quiz: "Quiz",
    quizKicker: "ZHAO · Quiz formation",
    quizLoading: "Chargement du quiz…",
    quizLoadError: "Impossible de charger le quiz. Réessayez plus tard.",
    quizSubmitError: "Échec de l’envoi. Vérifiez la connexion et réessayez.",
    quizIntro:
      "Répondez à toutes les questions. Si vous atteignez le seuil, cette formation sera validée.",
    quizAttempts: "Tentatives utilisées",
    quizMultipleHint: "Plusieurs réponses",
    quizPassed: "Réussi",
    quizFailed: "Non réussi",
    quizPassMark: "Seuil ",
    quizTitleUnlocked: "🎉 Nouveau titre obtenu",
    badgeUnlockedKicker: "ZHAO · BADGE DÉBLOQUÉ",
    badgeUnlockedTitle: "Vous avez obtenu un nouveau badge",
    badgeUnlockedIntro: "Cette réussite est maintenant enregistrée dans votre profil.",
    badgeUnlockedReasonSummary: "Obtenu après {count} formations obligatoires",
    badgeUnlockedDetails: "Voir les formations terminées",
    badgeUnlockedHideDetails: "Masquer les formations terminées",
    badgeUnlockedClose: "Recevoir le badge",
    quizSubmit: "Envoyer les réponses",
    quizSubmitting: "Envoi…",
    quizAnswerAllHint: "Veuillez répondre à toutes les questions.",
    quizDone: "Terminé",
    quizRetake: "Refaire le quiz",
    quizNoAttemptsLeft: "Vous n’avez plus de tentative disponible.",
    myTitles: "Mes titres",
    titlesEmpty: "Terminez les formations obligatoires d’un poste pour débloquer son titre.",
    titlesLocked: "Verrouillé",
    myRecords: "Historique",
    recordsEmpty: "Aucune formation terminée pour le moment.",
    completedOn: "Terminé le",
    hubOverallProgress: "Progression totale",
    hubActionContinue: "Continuer",
    hubActionStart: "Commencer",
    hubActionDone: "Terminé",
    mapLayerShared: "Bases communes",
    mapLayerRequired: "Formation du poste",
    mapLayerAdvanced: "Niveau avancé",
    mapLayerSharedBody: "Les bases à connaître pour tous les employés",
    mapLayerRequiredBody: "Les formations obligatoires selon votre poste",
    mapLayerAdvancedBody: "Des contenus plus avancés après les formations obligatoires",
    mapLocked: "Verrouillé",
    mapUnlockNext: "Terminez ce niveau pour débloquer le suivant",
    mapUnlockCondition: "Terminez les formations obligatoires pour débloquer le niveau avancé",
    mapNodeStudy: "Étudier",
    mapNodeQuiz: "Quiz",
    mapNodeComplete: "Terminé",
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
      ALL: "Tout le monde",
      FOH: "Salle",
      BOH: "Cuisine",
      FRONT_HOST: "Accueil",
      FRONT_CASHIER: "Caisse",
      FRONT_SERVER: "Service",
      FRONT_PACKER: "Emballage",
      FRONT_BAR: "Bar",
      BACK_DISHWASHER: "Plonge",
      BACK_NOODLE: "Poste nouilles",
      BACK_HOT_APPETIZER: "Entrées chaudes",
      BACK_COLD_APPETIZER: "Entrées froides",
      BACK_RICE: "Poste riz",
      SM: "Responsable restaurant",
      RM: "Responsable régional",
      HOLDING: "Siège",
    },
  },
};
