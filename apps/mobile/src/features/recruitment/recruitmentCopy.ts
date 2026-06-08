import type { AuthLanguage } from "@/features/auth/authCopy";
import type {
  RecruitmentContractType,
  RecruitmentPosition,
  RecruitmentRequestStatus,
} from "@zhao/types";

export const RECRUITMENT_CONTRACT_LABELS: Record<
  AuthLanguage,
  Record<RecruitmentContractType, string>
> = {
  zh: {
    full_time: "全职",
    part_time: "兼职",
  },
  en: {
    full_time: "Full time",
    part_time: "Part time",
  },
  fr: {
    full_time: "Temps plein",
    part_time: "Temps partiel",
  },
};

export const RECRUITMENT_POSITION_LABELS: Record<
  AuthLanguage,
  Record<RecruitmentPosition, string>
> = {
  zh: {
    waiter: "服务生",
    chef: "厨师",
    kitchen_assistant: "厨房助手",
  },
  en: {
    waiter: "Waiter",
    chef: "Chef",
    kitchen_assistant: "Kitchen assistant",
  },
  fr: {
    waiter: "Serveur",
    chef: "Cuisinier",
    kitchen_assistant: "Aide cuisine",
  },
};

export const RECRUITMENT_STATUS_LABELS: Record<
  AuthLanguage,
  Record<RecruitmentRequestStatus, string>
> = {
  zh: {
    pending: "待处理",
    in_progress: "处理中",
    completed: "完成",
  },
  en: {
    pending: "Pending",
    in_progress: "In progress",
    completed: "Completed",
  },
  fr: {
    pending: "En attente",
    in_progress: "En cours",
    completed: "Terminé",
  },
};

export const RECRUITMENT_COPY = {
  zh: {
    kicker: "ZHAO · PEOPLE",
    title: "招聘请求",
    titleAccent: "门店需求",
    intro: "向总部提交门店招聘需求，并查看当前处理状态。",
    formTitle: "提交新请求",
    contractTypeLabel: "合同类型",
    positionLabel: "岗位",
    headcountLabel: "人数",
    headcountPlaceholder: "请输入需要招聘的人数",
    notesLabel: "备注",
    notesPlaceholder: "例如：周末晚班缺人，需尽快安排。",
    submit: "提交请求",
    submitting: "提交中...",
    listTitle: "我的请求",
    loading: "正在加载招聘请求...",
    empty: "当前暂无招聘请求。",
    loadError: "招聘请求加载失败，请稍后重试。",
    submitSuccess: "招聘请求已提交。",
    submitError: "招聘请求提交失败，请稍后重试。",
    requiredError: "请选择合同类型和岗位，并填写有效人数。",
    deleteError: "删除失败，请稍后重试。",
    statusLabel: "状态",
    peopleUnit: "人",
    handledNotesLabel: "总部备注",
  },
  en: {
    kicker: "ZHAO · PEOPLE",
    title: "Recruitment",
    titleAccent: "Store needs",
    intro: "Send recruitment needs to headquarters and track their status.",
    formTitle: "New request",
    contractTypeLabel: "Contract type",
    positionLabel: "Position",
    headcountLabel: "Headcount",
    headcountPlaceholder: "Enter the number of people needed",
    notesLabel: "Notes",
    notesPlaceholder: "Example: Weekend evening shift needs support.",
    submit: "Submit request",
    submitting: "Submitting...",
    listTitle: "My requests",
    loading: "Loading recruitment requests...",
    empty: "No recruitment requests yet.",
    loadError: "Recruitment requests could not be loaded.",
    submitSuccess: "Recruitment request submitted.",
    submitError: "Recruitment request could not be submitted.",
    requiredError: "Choose a contract type, position and valid headcount.",
    deleteError: "Delete failed, please try again.",
    statusLabel: "Status",
    peopleUnit: "people",
    handledNotesLabel: "Headquarters note",
  },
  fr: {
    kicker: "ZHAO · PEOPLE",
    title: "Recrutement",
    titleAccent: "Besoin boutique",
    intro: "Envoyez les besoins de recrutement au siège et suivez leur statut.",
    formTitle: "Nouvelle demande",
    contractTypeLabel: "Type de contrat",
    positionLabel: "Poste",
    headcountLabel: "Nombre",
    headcountPlaceholder: "Indiquez le nombre de personnes",
    notesLabel: "Notes",
    notesPlaceholder: "Exemple : besoin pour le service du week-end.",
    submit: "Envoyer",
    submitting: "Envoi...",
    listTitle: "Mes demandes",
    loading: "Chargement des demandes...",
    empty: "Aucune demande de recrutement.",
    loadError: "Impossible de charger les demandes.",
    submitSuccess: "Demande de recrutement envoyée.",
    submitError: "La demande n'a pas pu être envoyée.",
    requiredError: "Choisissez un contrat, un poste et un nombre valide.",
    deleteError: "Échec de la suppression, réessayez.",
    statusLabel: "Statut",
    peopleUnit: "personnes",
    handledNotesLabel: "Note du siège",
  },
} as const;
