// Supplier fixed for this page: ZHAO Bureau (DB id = 8).
// Can be overridden via `?supplierId=X` query param if needed.
export const ZHAO_BUREAU_SUPPLIER_ID = 8;

export const INVENTORY_COPY = {
  zh: {
    topFamily: "FAMILY",
    topStage: "ZHAO Bureau 库存 · STOCK",
    topCycle: "WEEK 17 · 2026",
    kicker: "ZHAO's · 库存 · ZHAO BUREAU",
    title: "ZHAO Bureau",
    titleEm: "库存",
    titleSuffix: "。",
    lede: "记录 ZHAO Bureau 供应商的库存变动。正数表示入库，负数表示出库或调整。",
    back: "返回首页",
    footer: "Since 2011 — ZHAO's Family Holding",

    loading: "加载中…",
    loadError: "加载失败，请重试。",
    saving: "保存中…",
    saveError: "保存失败，请重试。",

    listHeading: "产品库存",
    count: "件产品",
    movementsHeading: "最近动态",
    movementsHint: "最近 50 条库存变动记录。",
    noMovements: "暂无库存变动记录。",

    colReference: "编号",
    colProduct: "产品",
    colUnit: "单位",
    colStock: "当前库存",
    colAddIn: "入库",
    colAddOut: "出库",
    colNote: "备注",
    colActions: "操作",

    qtyPlaceholder: "数量",
    notePlaceholder: "备注（可选）",
    addIn: "+ 入库",
    addOut: "− 出库",
    apply: "确认",
    cancel: "取消",

    positiveAbbr: "+",
    negativeAbbr: "−",

    colDate: "时间",
    colDelta: "变动",
    colSource: "来源",
    colReason: "原因",

    sourceManual: "手动",
    sourceOrder: "订单",
    sourceOther: "其他",

    validation: {
      qtyInvalid: "数量必须为正整数。",
    },

    empty: "该供应商暂无产品。",
  },
  en: {
    topFamily: "FAMILY",
    topStage: "ZHAO Bureau STOCK · 库存",
    topCycle: "WEEK 17 · 2026",
    kicker: "ZHAO's · STOCK · ZHAO BUREAU",
    title: "ZHAO Bureau ",
    titleEm: "stock",
    titleSuffix: ".",
    lede: "Track stock movements for the ZHAO Bureau supplier. Positive = incoming, negative = outgoing or adjustment.",
    back: "Back to home",
    footer: "Since 2011 — ZHAO's Family Holding",

    loading: "Loading…",
    loadError: "Failed to load. Please retry.",
    saving: "Saving…",
    saveError: "Save failed. Please retry.",

    listHeading: "Product stock",
    count: "products",
    movementsHeading: "Recent movements",
    movementsHint: "Last 50 stock events.",
    noMovements: "No movements yet.",

    colReference: "Reference",
    colProduct: "Product",
    colUnit: "Unit",
    colStock: "Current stock",
    colAddIn: "Stock in",
    colAddOut: "Stock out",
    colNote: "Note",
    colActions: "Actions",

    qtyPlaceholder: "qty",
    notePlaceholder: "note (optional)",
    addIn: "+ Stock in",
    addOut: "− Stock out",
    apply: "Apply",
    cancel: "Cancel",

    positiveAbbr: "+",
    negativeAbbr: "−",

    colDate: "When",
    colDelta: "Delta",
    colSource: "Source",
    colReason: "Reason",

    sourceManual: "Manual",
    sourceOrder: "Order",
    sourceOther: "Other",

    validation: {
      qtyInvalid: "Quantity must be a positive integer.",
    },

    empty: "No products for this supplier yet.",
  },
  fr: {
    topFamily: "FAMILY",
    topStage: "STOCK ZHAO Bureau · 库存",
    topCycle: "SEMAINE 17 · 2026",
    kicker: "ZHAO's · STOCK · ZHAO BUREAU",
    title: "Stock ",
    titleEm: "ZHAO Bureau",
    titleSuffix: ".",
    lede: "Suivi des mouvements de stock pour le fournisseur ZHAO Bureau. Positif = entrée, négatif = sortie ou correction.",
    back: "Retour à l'accueil",
    footer: "Since 2011 — ZHAO's Family Holding",

    loading: "Chargement…",
    loadError: "Échec du chargement. Réessayez.",
    saving: "Enregistrement…",
    saveError: "Échec de l'enregistrement.",

    listHeading: "Stock produit",
    count: "produits",
    movementsHeading: "Derniers mouvements",
    movementsHint: "50 derniers événements de stock.",
    noMovements: "Aucun mouvement pour le moment.",

    colReference: "Référence",
    colProduct: "Produit",
    colUnit: "Unité",
    colStock: "Stock actuel",
    colAddIn: "Entrée",
    colAddOut: "Sortie",
    colNote: "Note",
    colActions: "Actions",

    qtyPlaceholder: "qté",
    notePlaceholder: "note (optionnelle)",
    addIn: "+ Entrée",
    addOut: "− Sortie",
    apply: "Valider",
    cancel: "Annuler",

    positiveAbbr: "+",
    negativeAbbr: "−",

    colDate: "Quand",
    colDelta: "Variation",
    colSource: "Source",
    colReason: "Raison",

    sourceManual: "Manuel",
    sourceOrder: "Commande",
    sourceOther: "Autre",

    validation: {
      qtyInvalid: "La quantité doit être un entier positif.",
    },

    empty: "Aucun produit pour ce fournisseur.",
  },
};
