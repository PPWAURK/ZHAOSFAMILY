import type { AuthLanguage } from "@/features/auth/authCopy";
import type { CaseShareStatus, CaseShareType } from "@zhao/types";

export type CaseSharesCopy = {
  kicker: string;
  title: string;
  titleAccent: string;
  intro: string;
  mineTitle: string;
  mineIntro: string;
  publish: string;
  composerTitle: string;
  composerIntro: string;
  typeLabel: string;
  contentLabel: string;
  contentPlaceholder: string;
  imageLabel: string;
  imageEmptyHint: string;
  imagePick: string;
  imageReplace: string;
  imageRemove: string;
  imagePermission: string;
  submit: string;
  submitting: string;
  cancel: string;
  submitSuccess: string;
  submitError: string;
  contentRequired: string;
  uploadError: string;
  loading: string;
  feedEmpty: string;
  mineEmpty: string;
  loadError: string;
  reviewNoteLabel: string;
  delete: string;
  deleting: string;
  deleteTitle: string;
  deleteBody: string;
  deleteConfirm: string;
  deleteCancel: string;
  deleteSuccess: string;
  deleteError: string;
  like: string;
  comment: string;
  commentsTitle: string;
  commentPlaceholder: string;
  commentSend: string;
  commentSending: string;
  commentsEmpty: string;
  commentsLoadError: string;
  commentError: string;
  commentRequired: string;
  likeError: string;
  typeLabels: Record<CaseShareType, string>;
  statusLabels: Record<CaseShareStatus, string>;
};

export const CASE_SHARES_COPY: Record<AuthLanguage, CaseSharesCopy> = {
  zh: {
    kicker: "ZHAO · 案例",
    title: "优秀案例",
    titleAccent: "。",
    intro: "浏览伙伴分享的经验，也把你的门店实践提交给大家学习。",
    mineTitle: "我的案例",
    mineIntro: "查看你提交的案例、审核状态和未通过原因。",
    publish: "发布案例",
    composerTitle: "发布新案例",
    composerIntro: "写清楚发生了什么、怎么解决、值得大家学习的地方。",
    typeLabel: "案例类型",
    contentLabel: "案例内容",
    contentPlaceholder: "写下这次案例的经过与收获…",
    imageLabel: "图片（可选，最多 1 张）",
    imageEmptyHint: "添加现场、菜品、服务或团队照片，让案例更容易被理解。",
    imagePick: "选择图片",
    imageReplace: "更换图片",
    imageRemove: "移除图片",
    imagePermission: "需要相册权限。",
    submit: "提交审核",
    submitting: "提交中…",
    cancel: "取消",
    submitSuccess: "案例已提交，等待审核",
    submitError: "提交失败，请稍后重试。",
    contentRequired: "请先填写案例内容。",
    uploadError: "图片上传失败，请稍后重试。",
    loading: "加载中…",
    feedEmpty: "还没有公开案例，欢迎分享第一个门店经验。",
    mineEmpty: "你还没有发布案例，记录一次值得复盘的服务或团队经验。",
    loadError: "加载失败，请稍后重试。",
    reviewNoteLabel: "审核备注",
    delete: "删除",
    deleting: "删除中…",
    deleteTitle: "删除案例",
    deleteBody: "确认删除这条案例吗？此操作无法撤销。",
    deleteConfirm: "删除",
    deleteCancel: "取消",
    deleteSuccess: "案例已删除",
    deleteError: "删除失败，请稍后重试。",
    like: "点赞",
    comment: "评论",
    commentsTitle: "评论",
    commentPlaceholder: "写下你的评论…",
    commentSend: "发送",
    commentSending: "发送中…",
    commentsEmpty: "还没有评论，来抢沙发。",
    commentsLoadError: "评论加载失败，请稍后重试。",
    commentError: "评论发送失败，请稍后重试。",
    commentRequired: "请先输入评论内容。",
    likeError: "操作失败，请稍后重试。",
    typeLabels: { personal: "个人案例", team: "团队案例" },
    statusLabels: { pending: "待审核", approved: "已公开", rejected: "未通过" },
  },
  en: {
    kicker: "ZHAO · CASES",
    title: "Shared cases",
    titleAccent: ".",
    intro: "Learn from team experiences and submit your own store practice.",
    mineTitle: "My cases",
    mineIntro: "Review your submissions, approval status, and rejection notes.",
    publish: "Share a case",
    composerTitle: "Share a new case",
    composerIntro: "Describe what happened, how it was solved, and what others can learn.",
    typeLabel: "Case type",
    contentLabel: "Case content",
    contentPlaceholder: "Tell what happened and what you learned…",
    imageLabel: "Image (optional, 1 max)",
    imageEmptyHint: "Add a store, service, dish, or team photo to make the case clearer.",
    imagePick: "Pick an image",
    imageReplace: "Replace image",
    imageRemove: "Remove image",
    imagePermission: "Photo library permission is required.",
    submit: "Submit for review",
    submitting: "Submitting…",
    cancel: "Cancel",
    submitSuccess: "Case submitted, awaiting review",
    submitError: "Submission failed. Please try again.",
    contentRequired: "Please write the case content first.",
    uploadError: "Image upload failed. Please try again.",
    loading: "Loading…",
    feedEmpty: "No public cases yet. Share the first store experience.",
    mineEmpty: "You have not shared a case yet. Capture one service or team lesson.",
    loadError: "Loading failed. Please try again.",
    reviewNoteLabel: "Review note",
    delete: "Delete",
    deleting: "Deleting…",
    deleteTitle: "Delete case",
    deleteBody: "Delete this case? This cannot be undone.",
    deleteConfirm: "Delete",
    deleteCancel: "Cancel",
    deleteSuccess: "Case deleted",
    deleteError: "Delete failed. Please try again.",
    like: "Like",
    comment: "Comment",
    commentsTitle: "Comments",
    commentPlaceholder: "Write a comment…",
    commentSend: "Send",
    commentSending: "Sending…",
    commentsEmpty: "No comments yet — be the first.",
    commentsLoadError: "Failed to load comments. Please try again.",
    commentError: "Failed to send the comment. Please try again.",
    commentRequired: "Please type a comment first.",
    likeError: "Action failed. Please try again.",
    typeLabels: { personal: "Personal case", team: "Team case" },
    statusLabels: { pending: "Pending", approved: "Public", rejected: "Rejected" },
  },
  fr: {
    kicker: "ZHAO · CAS",
    title: "Cas partagés",
    titleAccent: ".",
    intro: "Parcourez les expériences des équipes et partagez vos pratiques terrain.",
    mineTitle: "Mes cas",
    mineIntro: "Consultez vos cas, leur statut de validation et les motifs de refus.",
    publish: "Partager un cas",
    composerTitle: "Partager un nouveau cas",
    composerIntro: "Expliquez la situation, la solution et ce que les équipes peuvent retenir.",
    typeLabel: "Type de cas",
    contentLabel: "Contenu du cas",
    contentPlaceholder: "Racontez ce qui s'est passé et ce que vous en retenez…",
    imageLabel: "Image (optionnelle, 1 max)",
    imageEmptyHint: "Ajoutez une photo terrain, service, plat ou équipe pour clarifier le cas.",
    imagePick: "Choisir une image",
    imageReplace: "Remplacer l'image",
    imageRemove: "Retirer l'image",
    imagePermission: "L'accès à la photothèque est requis.",
    submit: "Soumettre",
    submitting: "Envoi…",
    cancel: "Annuler",
    submitSuccess: "Cas soumis, en attente de validation",
    submitError: "Échec de l'envoi. Réessayez plus tard.",
    contentRequired: "Veuillez d'abord rédiger le contenu du cas.",
    uploadError: "Échec de l'envoi de l'image. Réessayez plus tard.",
    loading: "Chargement…",
    feedEmpty: "Aucun cas public pour le moment. Partagez la première expérience terrain.",
    mineEmpty: "Vous n'avez encore partagé aucun cas. Gardez une trace d'une leçon d'équipe.",
    loadError: "Échec du chargement. Réessayez plus tard.",
    reviewNoteLabel: "Note de validation",
    delete: "Supprimer",
    deleting: "Suppression…",
    deleteTitle: "Supprimer le cas",
    deleteBody: "Supprimer ce cas ? Action irréversible.",
    deleteConfirm: "Supprimer",
    deleteCancel: "Annuler",
    deleteSuccess: "Cas supprimé",
    deleteError: "Échec de la suppression. Réessayez plus tard.",
    like: "J'aime",
    comment: "Commenter",
    commentsTitle: "Commentaires",
    commentPlaceholder: "Écrivez un commentaire…",
    commentSend: "Envoyer",
    commentSending: "Envoi…",
    commentsEmpty: "Aucun commentaire — soyez le premier.",
    commentsLoadError: "Échec du chargement des commentaires. Réessayez plus tard.",
    commentError: "Échec de l'envoi du commentaire. Réessayez plus tard.",
    commentRequired: "Veuillez d'abord saisir un commentaire.",
    likeError: "Action échouée. Réessayez plus tard.",
    typeLabels: { personal: "Cas personnel", team: "Cas d'équipe" },
    statusLabels: { pending: "En attente", approved: "Public", rejected: "Refusé" },
  },
};
