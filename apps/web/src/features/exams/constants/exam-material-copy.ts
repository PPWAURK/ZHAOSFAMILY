import type { DifficultyProfileKey } from "../utils/difficultyTargets";
import type { ExamUiLanguage } from "./exam-languages";

/** Knowledge material targets (edit dialog) and the bank coverage table of the generation page. */
const ZH = {
  editor: {
    title: "编辑材料",
    fieldTitle: "标题",
    category: "分类(该文件生成的题目都属于这个分类)",
    noCategory: "未分类",
  },
  targets: {
    title: "题库目标(按难度)",
    hint: "选一个比例,按目标总数自动分配(最大余数法),之后可以再手动改。",
    total: "目标总数",
    profiles: {
      recallHeavy: "偏记忆 5:3:2",
      balanced: "均衡 4:3:3",
      scenarioHeavy: "偏情景 2:3:5",
    } as Record<DifficultyProfileKey, string>,
    sum: (n: number) => `合计 ${n} 题`,
    clear: "清除目标",
    none: "未设置",
  },
  coverage: {
    title: "按目标补题",
    subtitle:
      "每份材料的目标、已通过、待审核和缺口(目标 − 已通过 − 待审核)。勾选材料后按缺口精确生成,未设置目标的材料不会出题。",
    order: "每格依次为 记忆 / 理解 / 情景",
    columns: {
      material: "材料",
      targets: "目标",
      approved: "已通过",
      draft: "待审核",
      missing: "缺口",
    },
    uncategorized: "未分类",
    total: "合计",
    noTargets: "未设置目标",
    notReady: "未就绪",
    selectMissing: "勾选所有有缺口的材料",
    clearSelection: "清空勾选",
    selected: (n: number) => `已选 ${n} 份材料`,
    fill: "按目标补题",
    estimating: "估算中…",
    confirm: "确认生成",
    plan: (planned: number, requests: number, cost: string) =>
      `将生成 ${planned} 道缺口题,共 ${requests} 个请求,预计费用约 ${cost}。确认后开始生成。`,
  },
};

export type ExamMaterialCopy = typeof ZH;

const EN: ExamMaterialCopy = {
  editor: {
    title: "Edit material",
    fieldTitle: "Title",
    category: "Category (every question generated from this file gets it)",
    noCategory: "Uncategorized",
  },
  targets: {
    title: "Bank targets (per difficulty)",
    hint: "Pick a ratio to split the target total (largest remainder); you can still edit the numbers.",
    total: "Target total",
    profiles: {
      recallHeavy: "Recall-heavy 5:3:2",
      balanced: "Balanced 4:3:3",
      scenarioHeavy: "Scenario-heavy 2:3:5",
    },
    sum: (n) => `${n} questions in total`,
    clear: "Clear targets",
    none: "Not set",
  },
  coverage: {
    title: "Fill the targets",
    subtitle:
      "Target, approved, to review and missing (target − approved − to review) per material. Select materials to generate exactly what is missing; materials without targets generate nothing.",
    order: "Each cell: recall / understanding / scenario",
    columns: {
      material: "Material",
      targets: "Target",
      approved: "Approved",
      draft: "To review",
      missing: "Missing",
    },
    uncategorized: "Uncategorized",
    total: "Total",
    noTargets: "No targets",
    notReady: "Not ready",
    selectMissing: "Select every material with missing questions",
    clearSelection: "Clear selection",
    selected: (n) => `${n} materials selected`,
    fill: "Fill targets",
    estimating: "Estimating…",
    confirm: "Confirm and generate",
    plan: (planned, requests, cost) =>
      `${planned} missing questions will be generated in ${requests} requests, estimated cost ${cost}. Confirm to start.`,
  },
};

const FR: ExamMaterialCopy = {
  editor: {
    title: "Modifier le document",
    fieldTitle: "Titre",
    category: "Catégorie (attribuée à toutes les questions générées depuis ce fichier)",
    noCategory: "Sans catégorie",
  },
  targets: {
    title: "Objectifs de la banque (par niveau)",
    hint: "Choisissez une répartition pour diviser le total (plus forts restes) ; les nombres restent modifiables.",
    total: "Total visé",
    profiles: {
      recallHeavy: "Mémorisation 5:3:2",
      balanced: "Équilibré 4:3:3",
      scenarioHeavy: "Mise en situation 2:3:5",
    },
    sum: (n) => `${n} questions au total`,
    clear: "Effacer les objectifs",
    none: "Non défini",
  },
  coverage: {
    title: "Compléter les objectifs",
    subtitle:
      "Objectif, validées, à valider et manquantes (objectif − validées − à valider) par document. Sélectionnez des documents pour générer exactement ce qui manque ; sans objectif, rien n'est généré.",
    order: "Chaque case : mémorisation / compréhension / situation",
    columns: {
      material: "Document",
      targets: "Objectif",
      approved: "Validées",
      draft: "À valider",
      missing: "Manquantes",
    },
    uncategorized: "Sans catégorie",
    total: "Total",
    noTargets: "Sans objectif",
    notReady: "Pas prêt",
    selectMissing: "Sélectionner les documents incomplets",
    clearSelection: "Vider la sélection",
    selected: (n) => `${n} document(s) sélectionné(s)`,
    fill: "Compléter les objectifs",
    estimating: "Estimation…",
    confirm: "Confirmer et générer",
    plan: (planned, requests, cost) =>
      `${planned} questions manquantes seront générées en ${requests} requêtes, coût estimé ${cost}. Confirmez pour lancer.`,
  },
};

export const EXAM_MATERIAL_COPY: Record<ExamUiLanguage, ExamMaterialCopy> = {
  zh: ZH,
  en: EN,
  fr: FR,
};
