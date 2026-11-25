import type { InventoryRecordType } from "@/features/inventory/types/inventory";

export type InventoryLang = "zh" | "en" | "fr";

export type InventoryEntryCopy = {
  heading: string;
  hint: string;
  typeLabel: string;
  typeIn: string;
  typeOut: string;
  product: string;
  productPlaceholder: string;
  date: string;
  quantity: string;
  store: string;
  storeNone: string;
  note: string;
  notePlaceholder: string;
  handler: string;
  handlerValue: string;
  submit: string;
  submitting: string;
  saved: string;
  errors: {
    productRequired: string;
    qtyInvalid: string;
    dateRequired: string;
    saveFailed: string;
  };
};

export type InventoryRecordsCopy = {
  heading: string;
  hint: string;
  month: string;
  store: string;
  allStores: string;
  type: string;
  allTypes: string;
  export: string;
  loading: string;
  empty: string;
  loadError: string;
  summary: (counts: Record<InventoryRecordType, number>) => string;
  types: Record<InventoryRecordType, string>;
  columns: {
    type: string;
    date: string;
    supplier: string;
    store: string;
    reference: string;
    productCn: string;
    productFr: string;
    specification: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    orderNumber: string;
    deliveryDate: string;
    handler: string;
    note: string;
  };
};

export const INVENTORY_ENTRY_COPY: Record<InventoryLang, InventoryEntryCopy> = {
  zh: {
    heading: "入库 / 出库登记",
    hint: "提交后系统自动生成记录并更新库存。",
    typeLabel: "类型",
    typeIn: "入库",
    typeOut: "出库",
    product: "商品",
    productPlaceholder: "选择商品",
    date: "日期",
    quantity: "数量",
    store: "去向门店（可选）",
    storeNone: "不指定门店",
    note: "备注",
    notePlaceholder: "如：供应商送货、损耗、门店调拨…",
    handler: "经手人",
    handlerValue: "当前登录账号（自动记录）",
    submit: "提交记录",
    submitting: "提交中…",
    saved: "已保存",
    errors: {
      productRequired: "请选择商品",
      qtyInvalid: "数量必须为正整数",
      dateRequired: "请选择日期",
      saveFailed: "保存失败，请重试",
    },
  },
  en: {
    heading: "Stock in / out entry",
    hint: "Submitting creates the record and updates stock automatically.",
    typeLabel: "Type",
    typeIn: "Stock in",
    typeOut: "Stock out",
    product: "Product",
    productPlaceholder: "Select a product",
    date: "Date",
    quantity: "Quantity",
    store: "Destination store (optional)",
    storeNone: "No store",
    note: "Note",
    notePlaceholder: "e.g. supplier delivery, loss, store transfer…",
    handler: "Handled by",
    handlerValue: "Signed-in account (recorded automatically)",
    submit: "Save record",
    submitting: "Saving…",
    saved: "Saved",
    errors: {
      productRequired: "Select a product",
      qtyInvalid: "Quantity must be a positive whole number",
      dateRequired: "Select a date",
      saveFailed: "Could not save, please retry",
    },
  },
  fr: {
    heading: "Saisie entrée / sortie",
    hint: "L'enregistrement crée le mouvement et met à jour le stock automatiquement.",
    typeLabel: "Type",
    typeIn: "Entrée",
    typeOut: "Sortie",
    product: "Produit",
    productPlaceholder: "Choisir un produit",
    date: "Date",
    quantity: "Quantité",
    store: "Magasin destinataire (facultatif)",
    storeNone: "Aucun magasin",
    note: "Remarque",
    notePlaceholder: "ex. livraison fournisseur, perte, transfert magasin…",
    handler: "Saisi par",
    handlerValue: "Compte connecté (enregistré automatiquement)",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
    saved: "Enregistré",
    errors: {
      productRequired: "Choisissez un produit",
      qtyInvalid: "La quantité doit être un entier positif",
      dateRequired: "Choisissez une date",
      saveFailed: "Échec de l'enregistrement, réessayez",
    },
  },
};

export const INVENTORY_RECORDS_COPY: Record<InventoryLang, InventoryRecordsCopy> = {
  zh: {
    heading: "月度记录 · 导出",
    hint: "按月份查看入库、出库和各门店订购记录，可导出 CSV（Excel 可直接打开）。",
    month: "月份",
    store: "门店",
    allStores: "全部门店",
    type: "记录类型",
    allTypes: "全部类型",
    export: "导出 CSV",
    loading: "加载中…",
    empty: "该月份暂无记录",
    loadError: "记录加载失败（可能没有库存管理权限）",
    summary: (c) => `入库 ${c.in} 条 · 出库 ${c.out} 条 · 门店订购 ${c.store_order} 条`,
    types: { in: "入库", out: "出库", store_order: "门店订购" },
    columns: {
      type: "记录类型",
      date: "日期",
      supplier: "供应商",
      store: "门店",
      reference: "商品编号",
      productCn: "商品名称（中文）",
      productFr: "商品名称（法文）",
      specification: "规格",
      unit: "单位",
      quantity: "数量",
      unitPrice: "单价 HT",
      lineTotal: "小计 HT",
      orderNumber: "订单号",
      deliveryDate: "交付日期",
      handler: "经手人",
      note: "备注",
    },
  },
  en: {
    heading: "Monthly records · export",
    hint: "Browse stock in, stock out and store orders by month, and export to CSV (opens in Excel).",
    month: "Month",
    store: "Store",
    allStores: "All stores",
    type: "Record type",
    allTypes: "All types",
    export: "Export CSV",
    loading: "Loading…",
    empty: "No records for this month",
    loadError: "Could not load records (inventory permission may be missing)",
    summary: (c) => `${c.in} in · ${c.out} out · ${c.store_order} store order lines`,
    types: { in: "Stock in", out: "Stock out", store_order: "Store order" },
    columns: {
      type: "Record type",
      date: "Date",
      supplier: "Supplier",
      store: "Store",
      reference: "Reference",
      productCn: "Product (Chinese)",
      productFr: "Product (French)",
      specification: "Specification",
      unit: "Unit",
      quantity: "Quantity",
      unitPrice: "Unit price HT",
      lineTotal: "Line total HT",
      orderNumber: "Order number",
      deliveryDate: "Delivery date",
      handler: "Handled by",
      note: "Note",
    },
  },
  fr: {
    heading: "Historique mensuel · export",
    hint: "Entrées, sorties et commandes des magasins par mois, exportables en CSV (compatible Excel).",
    month: "Mois",
    store: "Magasin",
    allStores: "Tous les magasins",
    type: "Type",
    allTypes: "Tous les types",
    export: "Exporter CSV",
    loading: "Chargement…",
    empty: "Aucun enregistrement ce mois-ci",
    loadError: "Impossible de charger (droit de gestion du stock manquant ?)",
    summary: (c) =>
      `${c.in} entrées · ${c.out} sorties · ${c.store_order} lignes de commande magasin`,
    types: { in: "Entrée", out: "Sortie", store_order: "Commande magasin" },
    columns: {
      type: "Type",
      date: "Date",
      supplier: "Fournisseur",
      store: "Magasin",
      reference: "Référence",
      productCn: "Produit (chinois)",
      productFr: "Produit (français)",
      specification: "Spécification",
      unit: "Unité",
      quantity: "Quantité",
      unitPrice: "Prix unitaire HT",
      lineTotal: "Total ligne HT",
      orderNumber: "N° de commande",
      deliveryDate: "Date de livraison",
      handler: "Saisi par",
      note: "Remarque",
    },
  },
};
