export type AuthLanguage = "zh" | "en" | "fr";

export type AuthMode = "login" | "register";

export type RoleOption = {
  value: string;
  label: string;
  description: string;
};

export type AuthCopy = {
  topFamily: string;
  topStageLogin: string;
  topStageRegister: string;
  kickerLogin: string;
  kickerRegister: string;
  titleLogin: [string, string, string, string];
  titleRegister: [string, string, string, string];
  ledeLogin: string;
  ledeRegister: string;
  labelFamilyName: string;
  labelGivenName: string;
  labelAccount: string;
  labelPassword: string;
  labelBirthday: string;
  labelAvatar: string;
  labelJobRole: string;
  labelStore: string;
  phEmail: string;
  phFamilyName: string;
  phGivenName: string;
  phPassword: string;
  phBirthday: string;
  birthdayHint: string;
  avatarHint: string;
  show: string;
  hide: string;
  remember: string;
  agree: string;
  forgot: string;
  forgotSubmitting: string;
  forgotEmailRequired: string;
  forgotSuccess: string;
  forgotUnknownError: string;
  ctaLogin: string;
  loginSubmitting: string;
  ctaRegister: string;
  registerSubmitting: string;
  newHere: string;
  alreadyFamily: string;
  join: string;
  switchBack: string;
  help: string;
  supportOpenError: string;
  est: string;
  estYear: string;
  storeRefresh: string;
  storeRefreshing: string;
  storeSelectedPrefix: string;
  storePickLabel: string;
  storeSelectedLabel: string;
  termsText: string;
  logout: string;
  loadingSession: string;
  signedInTitle: string;
  signedInKicker: string;
  dashboardStoreLabel: string;
  dashboardRoleLabel: string;
  dashboardQuickActions: string;
  dashboardTraining: string;
  dashboardOrders: string;
  dashboardProfile: string;
  loginSaved: string;
  registrationPending: string;
  roleOptions: RoleOption[];
  errors: {
    invalidEmail: string;
    invalidPassword: string;
    invalidCredentials: string;
    accountPending: string;
    accountRejected: string;
    invalidBirthday: string;
    network: string;
    loginFallback: string;
    registerFallback: string;
    emailRegistered: string;
    restaurantRequired: string;
    termsRequired: string;
    nameRequired: string;
  };
};

export const LANGUAGE_OPTIONS: { value: AuthLanguage; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
];

const COMMON_ROLES_ZH: RoleOption[] = [
  { value: "holding", label: "总部", description: "总部管理与支持" },
  { value: "regional-manager", label: "区域经理", description: "负责多店支持与区域管理" },
  { value: "store-manager", label: "店长", description: "负责门店运营与带班" },
  { value: "front-manager", label: "前厅经理", description: "负责服务团队与现场节奏" },
  { value: "back-manager", label: "后厨经理", description: "负责厨房出品与后厨协作" },
  { value: "front-assistant", label: "前厅助理", description: "协助前厅排班、服务和培训" },
  { value: "back-assistant", label: "后厨助理", description: "协助后厨备料、出餐和培训" },
  { value: "front-of-house", label: "前厅", description: "服务、迎宾、门店体验" },
  { value: "back-of-house", label: "后厨", description: "备料、出餐、厨房协作" },
];

const COMMON_ROLES_EN: RoleOption[] = [
  { value: "holding", label: "Holding", description: "Headquarters management and support" },
  {
    value: "regional-manager",
    label: "Regional manager",
    description: "Supports multiple stores across the area",
  },
  { value: "store-manager", label: "Store manager", description: "Leads one store team" },
  {
    value: "front-manager",
    label: "Front manager",
    description: "Leads the floor team and service rhythm",
  },
  {
    value: "back-manager",
    label: "Kitchen manager",
    description: "Leads kitchen output and coordination",
  },
  {
    value: "front-assistant",
    label: "Front assistant",
    description: "Supports service, roster, and training",
  },
  {
    value: "back-assistant",
    label: "Kitchen assistant",
    description: "Supports prep, pass, and training",
  },
  { value: "front-of-house", label: "Front", description: "Service, hosting, guest experience" },
  { value: "back-of-house", label: "Kitchen", description: "Prep, pass, kitchen support" },
];

const COMMON_ROLES_FR: RoleOption[] = [
  { value: "holding", label: "Holding", description: "Direction et support siege" },
  {
    value: "regional-manager",
    label: "Manager regional",
    description: "Coordonne plusieurs boutiques",
  },
  { value: "store-manager", label: "Gerant", description: "Pilote une boutique" },
  {
    value: "front-manager",
    label: "Responsable salle",
    description: "Pilote le service et le rythme en salle",
  },
  {
    value: "back-manager",
    label: "Responsable cuisine",
    description: "Pilote la production et l'equipe cuisine",
  },
  {
    value: "front-assistant",
    label: "Assistant salle",
    description: "Soutient le service, le planning et la formation",
  },
  {
    value: "back-assistant",
    label: "Assistant cuisine",
    description: "Soutient la prep, l'envoi et la formation",
  },
  { value: "front-of-house", label: "Salle", description: "Service, accueil, experience client" },
  { value: "back-of-house", label: "Cuisine", description: "Preparation et envoi" },
];

export const AUTH_COPY: Record<AuthLanguage, AuthCopy> = {
  zh: {
    topFamily: "FAMILY",
    topStageLogin: "登入 · SIGN IN",
    topStageRegister: "加入",
    kickerLogin: "ZHAO's · FAMILY · ACCESS",
    kickerRegister: "ZHAO's · NEW · MEMBER",
    titleLogin: ["欢迎", "伙伴回来", "。", "请登入。"],
    titleRegister: ["没有伙伴", "账号", "？", "加入吧。"],
    ledeLogin: "使用你的账号进入系统。",
    ledeRegister: "留下你的名字与邮箱，我们给你安排好。",
    labelFamilyName: "SURNAME · 姓",
    labelGivenName: "GIVEN NAME · 名",
    labelAccount: "EMAIL · 账号",
    labelPassword: "PASSWORD · 密码",
    labelBirthday: "出生日期（可选）",
    labelAvatar: "AVATAR · 头像",
    labelJobRole: "POSITION · 主岗位",
    labelStore: "STORE · 门店",
    phEmail: "name@zhao-family.com",
    phFamilyName: "你的姓",
    phGivenName: "你的名",
    phPassword: "••••••••",
    phBirthday: "YYYY-MM-DD",
    birthdayHint: "此字段为可选，无需填写即可使用应用。",
    avatarHint: "可选，可拍照或从相册选择，用于员工档案头像。",
    show: "显示",
    hide: "隐藏",
    remember: "记住这台设备",
    agree: "同意条款",
    forgot: "忘记密码 ↗",
    forgotSubmitting: "发送中...",
    forgotEmailRequired: "请先填写邮箱。",
    forgotSuccess: "如果邮箱存在，重置邮件会发送到该地址。",
    forgotUnknownError: "重置邮件发送失败，请稍后重试。",
    ctaLogin: "进 入",
    loginSubmitting: "登入中",
    ctaRegister: "创建账号",
    registerSubmitting: "创建中",
    newHere: "初次到访?",
    alreadyFamily: "已经是伙伴了?",
    join: "申请加入 →",
    switchBack: "返回登入 →",
    help: "需要帮助?",
    supportOpenError: "无法打开帮助页面，请稍后重试。",
    est: "© La Taverne de ZHAO.",
    estYear: "2011",
    storeRefresh: "刷新",
    storeRefreshing: "加载中",
    storeSelectedPrefix: "已选：",
    storePickLabel: "选择",
    storeSelectedLabel: "已选",
    termsText: "同意条款并提交注册资料",
    logout: "退出登录",
    loadingSession: "正在恢复登录状态...",
    signedInTitle: "移动工作台",
    signedInKicker: "ZHAO'S FAMILY",
    dashboardStoreLabel: "门店",
    dashboardRoleLabel: "岗位",
    dashboardQuickActions: "快捷入口",
    dashboardTraining: "培训",
    dashboardOrders: "下单",
    dashboardProfile: "资料",
    loginSaved: "登录状态已保存。",
    registrationPending: "注册申请已提交。门店上级通过后，你就可以登录。",
    roleOptions: COMMON_ROLES_ZH,
    errors: {
      invalidEmail: "请输入有效邮箱。",
      invalidPassword: "密码至少需要 8 位。",
      invalidCredentials: "邮箱或密码不正确。",
      accountPending: "账号正在等待门店上级审批，通过后才能登录。",
      accountRejected: "账号申请未通过，请联系门店上级或总部。",
      invalidBirthday: "请选择有效出生日期。",
      network: "无法连接后端服务，请检查 API 地址和网络。",
      loginFallback: "登录失败，请稍后重试。",
      registerFallback: "注册失败，请稍后重试。",
      emailRegistered: "这个邮箱已经注册。",
      restaurantRequired: "请先选择门店。",
      termsRequired: "请先同意条款。",
      nameRequired: "请填写姓名。",
    },
  },
  en: {
    topFamily: "FAMILY",
    topStageLogin: "SIGN IN",
    topStageRegister: "JOIN",
    kickerLogin: "ZHAO's · FAMILY · ACCESS",
    kickerRegister: "ZHAO's · NEW · MEMBER",
    titleLogin: ["Welcome", " back", ".", "Please sign in."],
    titleRegister: ["No ", "account", "?", "Join us."],
    ledeLogin: "Use your account to sign in to the system.",
    ledeRegister: "Leave your name and email, and we will get everything ready.",
    labelFamilyName: "SURNAME",
    labelGivenName: "GIVEN NAME",
    labelAccount: "EMAIL",
    labelPassword: "PASSWORD",
    labelBirthday: "Date of birth (optional)",
    labelAvatar: "AVATAR",
    labelJobRole: "PRIMARY POSITION",
    labelStore: "STORE",
    phEmail: "name@zhao-family.com",
    phFamilyName: "Your surname",
    phGivenName: "Your given name",
    phPassword: "••••••••",
    phBirthday: "YYYY-MM-DD",
    birthdayHint: "This field is optional and is not required to use the app.",
    avatarHint: "Optional. Take a photo or choose one from your library.",
    show: "SHOW",
    hide: "HIDE",
    remember: "Remember this device",
    agree: "Accept terms",
    forgot: "Forgot password ↗",
    forgotSubmitting: "Sending...",
    forgotEmailRequired: "Enter your email first.",
    forgotSuccess: "If the email exists, a reset message will be sent.",
    forgotUnknownError: "Could not request a reset email. Please try again.",
    ctaLogin: "Sign in",
    loginSubmitting: "Signing in",
    ctaRegister: "Create account",
    registerSubmitting: "Creating",
    newHere: "First time here?",
    alreadyFamily: "Already with us?",
    join: "Request to join →",
    switchBack: "Back to sign in →",
    help: "Need help?",
    supportOpenError: "Could not open the help page. Please try again.",
    est: "© La Taverne de ZHAO.",
    estYear: "2011",
    storeRefresh: "Refresh",
    storeRefreshing: "Loading",
    storeSelectedPrefix: "Selected: ",
    storePickLabel: "Choose",
    storeSelectedLabel: "Selected",
    termsText: "Accept terms and submit registration",
    logout: "Sign out",
    loadingSession: "Restoring sign-in state...",
    signedInTitle: "Mobile workspace",
    signedInKicker: "ZHAO'S FAMILY",
    dashboardStoreLabel: "Store",
    dashboardRoleLabel: "Position",
    dashboardQuickActions: "Quick actions",
    dashboardTraining: "Training",
    dashboardOrders: "Orders",
    dashboardProfile: "Profile",
    loginSaved: "Sign-in state saved.",
    registrationPending: "Registration submitted. You can sign in after manager approval.",
    roleOptions: COMMON_ROLES_EN,
    errors: {
      invalidEmail: "Enter a valid email.",
      invalidPassword: "Password must be at least 8 characters.",
      invalidCredentials: "Email or password is incorrect.",
      accountPending: "Your account is waiting for manager approval before sign-in.",
      accountRejected: "Your account request was rejected. Contact your manager or headquarters.",
      invalidBirthday: "Choose a valid date of birth.",
      network: "Cannot reach the backend. Check API URL and network.",
      loginFallback: "Sign in failed. Please try again.",
      registerFallback: "Registration failed. Please try again.",
      emailRegistered: "This email is already registered.",
      restaurantRequired: "Choose a store first.",
      termsRequired: "Accept the terms first.",
      nameRequired: "Enter your name.",
    },
  },
  fr: {
    topFamily: "FAMILLE",
    topStageLogin: "CONNEXION",
    topStageRegister: "REJOINDRE",
    kickerLogin: "ZHAO's · ACCES FAMILLE",
    kickerRegister: "ZHAO's · NOUVEAU MEMBRE",
    titleLogin: ["De ", "retour", "?", "Connectez-vous."],
    titleRegister: ["Pas de ", "compte", "?", "Rejoins-nous."],
    ledeLogin: "Utilisez votre compte pour vous connecter au systeme.",
    ledeRegister: "Laissez votre nom et votre e-mail, nous preparons la suite.",
    labelFamilyName: "NOM DE FAMILLE",
    labelGivenName: "PRENOM",
    labelAccount: "E-MAIL",
    labelPassword: "MOT DE PASSE",
    labelBirthday: "Date de naissance (facultatif)",
    labelAvatar: "PHOTO",
    labelJobRole: "POSTE PRINCIPAL",
    labelStore: "BOUTIQUE",
    phEmail: "name@zhao-family.com",
    phFamilyName: "Votre nom",
    phGivenName: "Votre prenom",
    phPassword: "••••••••",
    phBirthday: "YYYY-MM-DD",
    birthdayHint: "Ce champ est facultatif et n’est pas nécessaire pour utiliser l’application.",
    avatarHint: "Optionnel. Prenez une photo ou choisissez-en une.",
    show: "AFFICHER",
    hide: "MASQUER",
    remember: "Se souvenir de cet appareil",
    agree: "Accepter les conditions",
    forgot: "Mot de passe oublie ↗",
    forgotSubmitting: "Envoi...",
    forgotEmailRequired: "Saisissez d'abord votre e-mail.",
    forgotSuccess: "Si l'e-mail existe, un message de reinitialisation sera envoye.",
    forgotUnknownError: "Impossible de demander la reinitialisation.",
    ctaLogin: "Connexion",
    loginSubmitting: "Connexion",
    ctaRegister: "Creer le compte",
    registerSubmitting: "Creation",
    newHere: "Premiere visite?",
    alreadyFamily: "Deja avec nous?",
    join: "Demander a rejoindre →",
    switchBack: "Retour connexion →",
    help: "Besoin d'aide?",
    supportOpenError: "Impossible d'ouvrir la page d'aide. Reessayez plus tard.",
    est: "© La Taverne de ZHAO.",
    estYear: "2011",
    storeRefresh: "Rafraichir",
    storeRefreshing: "Chargement",
    storeSelectedPrefix: "Selection: ",
    storePickLabel: "Choisir",
    storeSelectedLabel: "Selection",
    termsText: "Accepter les conditions et envoyer",
    logout: "Se deconnecter",
    loadingSession: "Restauration de la session...",
    signedInTitle: "Espace mobile",
    signedInKicker: "ZHAO'S FAMILY",
    dashboardStoreLabel: "Boutique",
    dashboardRoleLabel: "Poste",
    dashboardQuickActions: "Acces rapides",
    dashboardTraining: "Formation",
    dashboardOrders: "Commandes",
    dashboardProfile: "Profil",
    loginSaved: "Session enregistree.",
    registrationPending: "Demande envoyee. Vous pourrez vous connecter apres approbation.",
    roleOptions: COMMON_ROLES_FR,
    errors: {
      invalidEmail: "Saisissez un e-mail valide.",
      invalidPassword: "Le mot de passe doit contenir au moins 8 caracteres.",
      invalidCredentials: "E-mail ou mot de passe incorrect.",
      accountPending: "Votre compte attend l'approbation d'un responsable avant la connexion.",
      accountRejected:
        "Votre demande de compte a ete refusee. Contactez un responsable ou le siege.",
      invalidBirthday: "Choisissez une date de naissance valide.",
      network: "Backend inaccessible. Verifiez l'URL API et le reseau.",
      loginFallback: "Connexion impossible. Reessayez plus tard.",
      registerFallback: "Inscription impossible. Reessayez plus tard.",
      emailRegistered: "Cet e-mail est deja inscrit.",
      restaurantRequired: "Choisissez d'abord une boutique.",
      termsRequired: "Acceptez les conditions.",
      nameRequired: "Saisissez votre nom.",
    },
  },
};
