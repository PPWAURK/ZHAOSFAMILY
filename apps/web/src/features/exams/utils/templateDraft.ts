import type {
  ExamBlueprint,
  ExamPoolConfigInput,
  ExamTemplate,
  ExamTemplateInput,
} from "@zhao/types";

export type TemplateMode = "simple" | "sectioned";

/** Every editable field of a template except the blueprint, which is edited apart. */
export type TemplateDraft = Required<Omit<ExamTemplateInput, "blueprint">>;

export function toTemplateDraft(template: ExamTemplate | null): TemplateDraft {
  return {
    titleZh: template?.titleZh ?? "",
    titleFr: template?.titleFr ?? "",
    descriptionZh: template?.descriptionZh ?? "",
    descriptionFr: template?.descriptionFr ?? "",
    singleCount: template?.singleCount ?? 20,
    multipleCount: template?.multipleCount ?? 5,
    booleanCount: template?.booleanCount ?? 5,
    categoryIds: template?.categoryIds ?? [],
    materialIds: template?.materialIds ?? [],
    difficulties: template?.difficulties ?? [],
    timeLimitMinutes: template?.timeLimitMinutes ?? 30,
    passingScore: template?.passingScore ?? 80,
    maxAttempts: template?.maxAttempts ?? null,
    shuffleOptions: template?.shuffleOptions ?? true,
    showExplanations: template?.showExplanations ?? true,
    isActive: template?.isActive ?? false,
    accessMode: template?.accessMode ?? "LIST",
  };
}

export function toPoolConfig(draft: TemplateDraft): ExamPoolConfigInput {
  return {
    singleCount: draft.singleCount,
    multipleCount: draft.multipleCount,
    booleanCount: draft.booleanCount,
    categoryIds: draft.categoryIds,
    materialIds: draft.materialIds,
    difficulties: draft.difficulties,
  };
}

/**
 * What the API receives. A sectioned paper sends its blueprint and lets the
 * server derive counts and time limit; a simple one sends counts and filters
 * and `blueprint: null` (switching an existing sectioned template back).
 */
export function toTemplateInput(
  draft: TemplateDraft,
  mode: TemplateMode,
  blueprint: ExamBlueprint,
): ExamTemplateInput {
  const common: ExamTemplateInput = {
    titleZh: draft.titleZh,
    titleFr: draft.titleFr,
    descriptionZh: draft.descriptionZh || null,
    descriptionFr: draft.descriptionFr || null,
    passingScore: draft.passingScore,
    maxAttempts: draft.maxAttempts,
    shuffleOptions: draft.shuffleOptions,
    showExplanations: draft.showExplanations,
    isActive: draft.isActive,
    accessMode: draft.accessMode,
  };
  if (mode === "sectioned") return { ...common, blueprint };
  return {
    ...common,
    ...toPoolConfig(draft),
    timeLimitMinutes: draft.timeLimitMinutes,
    blueprint: null,
  };
}
