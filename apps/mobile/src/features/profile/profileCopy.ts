import type { AuthLanguage } from "@/features/auth/authCopy";

export const PROFILE_COPY: Record<
  AuthLanguage,
  {
    accountHeading: string;
    accountHint: string;
    address: string;
    avatarAction: string;
    avatarError: string;
    avatarSaved: string;
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
    deleteHeading: string;
    deleteHint: string;
    deleteAction: string;
    deleteWarning: string;
    deletePasswordLabel: string;
    deletePasswordRequired: string;
    deleteConfirm: string;
    deleting: string;
    deleteError: string;
    name: string;
    noValue: string;
    phone: string;
    preferencesHeading: string;
    preferencesHint: string;
    currentPassword: string;
    newPassword: string;
    passwordChanged: string;
    passwordError: string;
    passwordMismatch: string;
    passwordTooShort: string;
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
    trainingRecords: string;
    trainingRecordsHint: string;
    trainingRecordsEmpty: string;
  }
> = {
  zh: {
    accountHeading: "账号安全",
    accountHint: "修改密码前需要验证当前密码。",
    address: "地址",
    avatarAction: "更换头像",
    avatarError: "头像保存失败，请重新选择。",
    avatarSaved: "头像已更新",
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
    deleteHeading: "删除账号",
    deleteHint: "永久删除后无法恢复，你的个人信息将被匿名化。",
    deleteAction: "删除我的账号",
    deleteWarning:
      "此操作不可撤销。确认后你的账号将被停用、个人信息将被匿名化，且你会立即退出登录。请输入当前密码以确认。",
    deletePasswordLabel: "当前密码",
    deletePasswordRequired: "请输入当前密码。",
    deleteConfirm: "永久删除账号",
    deleting: "正在删除…",
    deleteError: "删除失败，请检查密码后重试。",
    name: "姓名",
    noValue: "未填写",
    phone: "电话",
    preferencesHeading: "偏好",
    preferencesHint: "语言切换只影响当前 App 会话。",
    currentPassword: "当前密码",
    newPassword: "新密码",
    passwordChanged: "密码已修改",
    passwordError: "密码修改失败，请检查当前密码。",
    passwordMismatch: "两次密码不能相同。",
    passwordTooShort: "新密码至少 8 位。",
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
    trainingRecords: "培训记录",
    trainingRecordsHint: "已完成的培训资料与测验成绩。",
    trainingRecordsEmpty: "还没有已完成的培训。",
  },
  en: {
    accountHeading: "Account security",
    accountHint: "Your current password is required before changing it.",
    address: "Address",
    avatarAction: "Change photo",
    avatarError: "Photo could not be saved. Please choose another image.",
    avatarSaved: "Photo updated",
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
    deleteHeading: "Delete account",
    deleteHint: "Deletion is permanent and your personal data will be anonymized.",
    deleteAction: "Delete my account",
    deleteWarning:
      "This action cannot be undone. Once confirmed, your account is deactivated, your personal data is anonymized, and you are signed out immediately. Enter your current password to confirm.",
    deletePasswordLabel: "Current password",
    deletePasswordRequired: "Please enter your current password.",
    deleteConfirm: "Permanently delete account",
    deleting: "Deleting…",
    deleteError: "Deletion failed. Check your password and try again.",
    name: "Name",
    noValue: "Not set",
    phone: "Phone",
    preferencesHeading: "Preferences",
    preferencesHint: "Language changes only affect this app session.",
    currentPassword: "Current password",
    newPassword: "New password",
    passwordChanged: "Password changed",
    passwordError: "Password could not be changed. Check your current password.",
    passwordMismatch: "The new password must be different.",
    passwordTooShort: "New password must be at least 8 characters.",
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
    trainingRecords: "Training records",
    trainingRecordsHint: "Completed training materials and quiz scores.",
    trainingRecordsEmpty: "No completed training yet.",
  },
  fr: {
    accountHeading: "Sécurité du compte",
    accountHint: "Le mot de passe actuel est requis avant modification.",
    address: "Adresse",
    avatarAction: "Changer la photo",
    avatarError: "La photo n'a pas pu être enregistrée. Choisissez une autre image.",
    avatarSaved: "Photo mise à jour",
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
    deleteHeading: "Supprimer le compte",
    deleteHint: "La suppression est définitive et vos données personnelles seront anonymisées.",
    deleteAction: "Supprimer mon compte",
    deleteWarning:
      "Cette action est irréversible. Une fois confirmée, votre compte est désactivé, vos données personnelles sont anonymisées et vous êtes déconnecté immédiatement. Saisissez votre mot de passe actuel pour confirmer.",
    deletePasswordLabel: "Mot de passe actuel",
    deletePasswordRequired: "Veuillez saisir votre mot de passe actuel.",
    deleteConfirm: "Supprimer définitivement le compte",
    deleting: "Suppression…",
    deleteError: "Échec de la suppression. Vérifiez votre mot de passe et réessayez.",
    name: "Nom",
    noValue: "Non renseigné",
    phone: "Téléphone",
    preferencesHeading: "Préférences",
    preferencesHint: "Le changement de langue ne concerne que cette session.",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    passwordChanged: "Mot de passe modifié",
    passwordError: "Le mot de passe n'a pas pu être modifié. Vérifiez le mot de passe actuel.",
    passwordMismatch: "Le nouveau mot de passe doit être différent.",
    passwordTooShort: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
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
    trainingRecords: "Historique de formation",
    trainingRecordsHint: "Supports terminés et scores quiz.",
    trainingRecordsEmpty: "Aucune formation terminée pour l'instant.",
  },
};
