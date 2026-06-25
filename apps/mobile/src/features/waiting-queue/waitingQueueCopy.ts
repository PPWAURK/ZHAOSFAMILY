import type { AuthLanguage } from "@/features/auth/authCopy";

export type WaitingQueueCopy = {
  kicker: string;
  title: string;
  titleAccent: string;
  intro: string;
  formTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  partySizeLabel: string;
  specialCasesLabel: string;
  disabled: string;
  pregnant: string;
  elderly: string;
  noteLabel: string;
  notePlaceholder: string;
  submit: string;
  submitting: string;
  submitSuccess: string;
  submitError: string;
  requiredError: string;
  listTitle: string;
  loading: string;
  empty: string;
  loadError: string;
  peopleUnit: string;
  waitingFor: string;
  minutesUnit: string;
  seat: string;
  seating: string;
  seatError: string;
};

export const WAITING_QUEUE_COPY: Record<AuthLanguage, WaitingQueueCopy> = {
  zh: {
    kicker: "ZHAO · 排队",
    title: "排队管理",
    titleAccent: "QUEUE",
    intro: "登记排队的客人，全店共享，叫号后点击「入座」移出列表。",
    formTitle: "添加客人",
    nameLabel: "姓名",
    namePlaceholder: "客人姓名",
    partySizeLabel: "用餐人数",
    specialCasesLabel: "特殊情况",
    disabled: "残障人士",
    pregnant: "孕妇",
    elderly: "老年人",
    noteLabel: "备注",
    notePlaceholder: "可选备注",
    submit: "加入排队",
    submitting: "添加中…",
    submitSuccess: "已加入排队",
    submitError: "添加失败，请重试",
    requiredError: "请填写姓名和人数",
    listTitle: "当前排队",
    loading: "加载中…",
    empty: "暂无排队客人",
    loadError: "加载失败，请重试",
    peopleUnit: "人",
    waitingFor: "已等待",
    minutesUnit: "分钟",
    seat: "入座",
    seating: "处理中…",
    seatError: "操作失败，请重试",
  },
  en: {
    kicker: "ZHAO · QUEUE",
    title: "Waiting queue",
    titleAccent: "QUEUE",
    intro: "Register waiting guests, shared across the store. Tap “Seat” to remove them.",
    formTitle: "Add a guest",
    nameLabel: "Name",
    namePlaceholder: "Guest name",
    partySizeLabel: "Party size",
    specialCasesLabel: "Special cases",
    disabled: "Disabled",
    pregnant: "Pregnant",
    elderly: "Elderly",
    noteLabel: "Note",
    notePlaceholder: "Optional note",
    submit: "Add to queue",
    submitting: "Adding…",
    submitSuccess: "Added to the queue",
    submitError: "Could not add, please retry",
    requiredError: "Please fill in name and party size",
    listTitle: "Current queue",
    loading: "Loading…",
    empty: "No one is waiting",
    loadError: "Could not load, please retry",
    peopleUnit: "ppl",
    waitingFor: "Waiting",
    minutesUnit: "min",
    seat: "Seat",
    seating: "Working…",
    seatError: "Action failed, please retry",
  },
  fr: {
    kicker: "ZHAO · FILE",
    title: "File d'attente",
    titleAccent: "QUEUE",
    intro: "Enregistrez les clients en attente, partagé dans tout l'établissement. Touchez « Faire entrer » pour les retirer.",
    formTitle: "Ajouter un client",
    nameLabel: "Nom",
    namePlaceholder: "Nom du client",
    partySizeLabel: "Nombre de personnes",
    specialCasesLabel: "Cas spéciaux",
    disabled: "Handicapé",
    pregnant: "Enceinte",
    elderly: "Personne âgée",
    noteLabel: "Note",
    notePlaceholder: "Note facultative",
    submit: "Ajouter à la file",
    submitting: "Ajout…",
    submitSuccess: "Ajouté à la file",
    submitError: "Échec de l'ajout, réessayez",
    requiredError: "Renseignez le nom et le nombre de personnes",
    listTitle: "File actuelle",
    loading: "Chargement…",
    empty: "Personne en attente",
    loadError: "Échec du chargement, réessayez",
    peopleUnit: "pers.",
    waitingFor: "Attente",
    minutesUnit: "min",
    seat: "Faire entrer",
    seating: "Traitement…",
    seatError: "Action échouée, réessayez",
  },
};
