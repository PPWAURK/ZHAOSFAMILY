import type { AuthLanguage } from "@/features/auth/authCopy";

export const PROFILE_COPY: Record<
  AuthLanguage,
  {
    accountHeading: string;
    accountHint: string;
    address: string;
    cancel: string;
    contactHeading: string;
    contactHint: string;
    edit: string;
    email: string;
    identityHeading: string;
    identityHint: string;
    language: string;
    logout: string;
    logoutHeading: string;
    logoutHint: string;
    name: string;
    noValue: string;
    phone: string;
    preferencesHeading: string;
    preferencesHint: string;
    role: string;
    save: string;
    saved: string;
    saving: string;
    status: string;
    store: string;
    title: string;
    titleAccent: string;
    titleSuffix: string;
    updateError: string;
  }
> = {
  zh: {
    accountHeading: "账号安全",
    accountHint: "密码修改入口后续会接入重置流程。",
    address: "地址",
    cancel: "取消",
    contactHeading: "联系方式",
    contactHint: "用于紧急联系与运营通知。",
    edit: "编辑",
    email: "邮箱",
    identityHeading: "身份信息",
    identityHint: "姓名、门店和岗位由管理员维护。",
    language: "界面语言",
    logout: "退出登录",
    logoutHeading: "登录状态",
    logoutHint: "结束当前会话并返回登录页。",
    name: "姓名",
    noValue: "未填写",
    phone: "电话",
    preferencesHeading: "偏好",
    preferencesHint: "语言切换只影响当前 App 会话。",
    role: "岗位",
    save: "保存",
    saved: "已保存",
    saving: "保存中...",
    status: "账号状态",
    store: "门店",
    title: "个人",
    titleAccent: "资料",
    titleSuffix: "。",
    updateError: "资料保存失败，请稍后重试。",
  },
  en: {
    accountHeading: "Account security",
    accountHint: "Password changes will connect to the reset flow later.",
    address: "Address",
    cancel: "Cancel",
    contactHeading: "Contact",
    contactHint: "Used for emergencies and operational notices.",
    edit: "Edit",
    email: "Email",
    identityHeading: "Identity",
    identityHint: "Name, store and role are managed by administrators.",
    language: "Interface language",
    logout: "Sign out",
    logoutHeading: "Session",
    logoutHint: "End this session and return to login.",
    name: "Name",
    noValue: "Not set",
    phone: "Phone",
    preferencesHeading: "Preferences",
    preferencesHint: "Language changes only affect this app session.",
    role: "Role",
    save: "Save",
    saved: "Saved",
    saving: "Saving...",
    status: "Account status",
    store: "Store",
    title: "Your ",
    titleAccent: "profile",
    titleSuffix: ".",
    updateError: "Profile could not be saved. Please try again.",
  },
  fr: {
    accountHeading: "Sécurité du compte",
    accountHint: "Le changement de mot de passe sera relié au flux de réinitialisation.",
    address: "Adresse",
    cancel: "Annuler",
    contactHeading: "Coordonnées",
    contactHint: "Utilisées en cas d'urgence et pour les notifications d'exploitation.",
    edit: "Modifier",
    email: "Email",
    identityHeading: "Identité",
    identityHint: "Le nom, la boutique et le poste sont gérés par les administrateurs.",
    language: "Langue de l'interface",
    logout: "Se déconnecter",
    logoutHeading: "Session",
    logoutHint: "Terminez cette session et retournez à la connexion.",
    name: "Nom",
    noValue: "Non renseigné",
    phone: "Téléphone",
    preferencesHeading: "Préférences",
    preferencesHint: "Le changement de langue ne concerne que cette session.",
    role: "Poste",
    save: "Enregistrer",
    saved: "Enregistré",
    saving: "Enregistrement...",
    status: "Statut du compte",
    store: "Boutique",
    title: "Votre ",
    titleAccent: "profil",
    titleSuffix: ".",
    updateError: "Le profil n'a pas pu être enregistré. Réessayez plus tard.",
  },
};
