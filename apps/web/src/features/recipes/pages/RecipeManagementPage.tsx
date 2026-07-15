"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type {
  CreateRecipeRequest,
  Recipe,
  RecipeIngredientInput,
  RecipeLocalizedText,
  RecipeStatus,
  RecipeStepInput,
} from "@zhao/types";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import { RECIPE_ROLE_OPTIONS } from "@/features/recipes/constants/recipe-role-options";
import {
  createRecipe,
  fetchRecipes,
  resolveRecipeImageUrl,
  updateRecipe,
  uploadRecipeImage,
} from "@/features/recipes/services/recipesApi";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/recipes/recipe-management-page.module.css";

type DashboardLanguage = "zh" | "en" | "fr";
type EditableRecipe = Omit<Recipe, "id" | "coverImageUrl" | "finishedImageUrl" | "note" | "ingredients" | "steps"> & {
  id: number | string;
  coverImageUrl: string;
  finishedImageUrl: string;
  note: RecipeLocalizedText;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
};
type RecipeImageKind = "cover" | "finished";

const FALLBACK_IMAGE = "/四大天王/1401631517540_.pic_hd.jpg";

function toEditableRecipe(recipe: Recipe): EditableRecipe {
  return {
    ...recipe,
    coverImageUrl: recipe.coverImageUrl ?? "",
    finishedImageUrl: recipe.finishedImageUrl ?? "",
    note: recipe.note ?? { zh: "", fr: "" },
    ingredients: recipe.ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
    steps: recipe.steps.map(({ instruction }) => ({ instruction })),
  };
}

function createDraftRecipe(): EditableRecipe {
  return {
    id: `draft-${Date.now()}`,
    name: { zh: "未命名食谱", fr: "Recette sans nom" },
    category: { zh: "未分类", fr: "Non classée" },
    tags: [],
    servings: 1,
    preparationMinutes: 0,
    cookingMinutes: 0,
    coverImageUrl: "",
    finishedImageUrl: "",
    note: { zh: "", fr: "" },
    status: "draft",
    jobRoles: [],
    ingredients: [
      { name: { zh: "", fr: "" }, quantity: 0, unit: { zh: "g", fr: "g" } },
    ],
    steps: [{ instruction: { zh: "", fr: "" } }],
    createdAt: "",
    updatedAt: "",
  };
}

function roleNames(roleIds: string[]): string {
  return roleIds
    .map((roleId) => RECIPE_ROLE_OPTIONS.find((role) => role.value === roleId)?.label)
    .filter(Boolean)
    .join(" · ");
}

function localizedLabel(value: RecipeLocalizedText, language: "zh" | "fr"): string {
  return value[language] || value.zh || value.fr;
}

function tagsToText(tags: RecipeLocalizedText[], language: "zh" | "fr"): string {
  return tags.map((tag) => localizedLabel(tag, language)).join(", ");
}

function toSaveRequest(recipe: EditableRecipe): CreateRecipeRequest {
  return {
    name: {
      zh: recipe.name.zh.trim(),
      fr: recipe.name.fr.trim(),
    },
    category: {
      zh: recipe.category.zh.trim(),
      fr: recipe.category.fr.trim(),
    },
    tags: recipe.tags,
    servings: recipe.servings,
    preparationMinutes: recipe.preparationMinutes,
    cookingMinutes: recipe.cookingMinutes,
    ...(recipe.coverImageUrl.trim() ? { coverImageUrl: recipe.coverImageUrl.trim() } : {}),
    ...(recipe.finishedImageUrl.trim()
      ? { finishedImageUrl: recipe.finishedImageUrl.trim() }
      : {}),
    ...(recipe.note.zh.trim() || recipe.note.fr.trim()
      ? {
          note: {
            zh: recipe.note.zh.trim(),
            fr: recipe.note.fr.trim(),
          },
        }
      : {}),
    status: recipe.status,
    jobRoles: recipe.jobRoles,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
}

function isLocalizedTextComplete(value: RecipeLocalizedText): boolean {
  return Boolean(value.zh.trim() && value.fr.trim());
}

function getRecipeValidationError(recipe: EditableRecipe): string | null {
  if (!isLocalizedTextComplete(recipe.name)) {
    return "请填写食谱名称的中文和法文。";
  }
  if (!isLocalizedTextComplete(recipe.category)) {
    return "请填写分类的中文和法文。";
  }
  if (recipe.tags.some((tag) => !isLocalizedTextComplete(tag))) {
    return "每个标签都需要填写中文和法文。";
  }
  if (recipe.jobRoles.length === 0) {
    return "请至少选择一个岗位可见范围。";
  }
  if (
    recipe.ingredients.some(
      (ingredient) =>
        !isLocalizedTextComplete(ingredient.name) ||
        !isLocalizedTextComplete(ingredient.unit),
    )
  ) {
    return "每项食材和单位都需要填写中文和法文。";
  }
  if (recipe.steps.some((step) => !isLocalizedTextComplete(step.instruction))) {
    return "每个制作步骤都需要填写中文和法文。";
  }
  if (
    (recipe.note.zh.trim() || recipe.note.fr.trim()) &&
    !isLocalizedTextComplete(recipe.note)
  ) {
    return "备注如需填写，请同时填写中文和法文。";
  }

  return null;
}

export default function RecipeManagementPage() {
  const [lang, setLang] = usePreferredLanguage() as [
    DashboardLanguage,
    (language: DashboardLanguage) => void,
  ];
  const [menuOpen, setMenuOpen] = useState(false);
  const [recipes, setRecipes] = useState<EditableRecipe[]>([]);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecipeStatus>("all");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [imageError, setImageError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<RecipeImageKind | null>(null);
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId) ?? null;
  const visibleRecipes = useMemo(
    () =>
      recipes.filter((recipe) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = !query || [
          recipe.name.zh,
          recipe.name.fr,
          recipe.category.zh,
          recipe.category.fr,
          ...recipe.tags.flatMap((tag) => [tag.zh, tag.fr]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
        const matchesStatus = statusFilter === "all" || recipe.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [recipes, searchTerm, statusFilter],
  );

  useEffect(() => {
    let isActive = true;

    async function loadRecipes(): Promise<void> {
      try {
        setLoadError("");
        const loadedRecipes = (await fetchRecipes({ pageSize: 100 })).map(toEditableRecipe);
        if (!isActive) return;
        setRecipes(loadedRecipes);
        setSelectedId((current) => current ?? loadedRecipes[0]?.id ?? null);
      } catch (error) {
        if (isActive) setLoadError(error instanceof Error ? error.message : "食谱加载失败。");
      }
    }

    void loadRecipes();
    return () => {
      isActive = false;
    };
  }, []);

  function updateSelectedRecipe(patch: Partial<EditableRecipe>): void {
    if (!selectedRecipe) return;

    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === selectedRecipe.id ? { ...recipe, ...patch } : recipe,
      ),
    );
    setSaveError("");
  }

  function toggleRole(roleId: string): void {
    if (!selectedRecipe) return;
    const jobRoles = selectedRecipe.jobRoles.includes(roleId)
      ? selectedRecipe.jobRoles.filter((value) => value !== roleId)
      : [...selectedRecipe.jobRoles, roleId];
    updateSelectedRecipe({ jobRoles });
  }

  function updateIngredientText(
    index: number,
    field: "name" | "unit",
    language: "zh" | "fr",
    value: string,
  ): void {
    if (!selectedRecipe) return;
    const ingredients = selectedRecipe.ingredients.map((ingredient, ingredientIndex) =>
      ingredientIndex === index
        ? { ...ingredient, [field]: { ...ingredient[field], [language]: value } }
        : ingredient,
    );
    updateSelectedRecipe({ ingredients });
  }

  function updateIngredientQuantity(index: number, value: string): void {
    if (!selectedRecipe) return;
    updateSelectedRecipe({
      ingredients: selectedRecipe.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, quantity: Number(value) } : ingredient,
      ),
    });
  }

  function updateStep(index: number, language: "zh" | "fr", value: string): void {
    if (!selectedRecipe) return;
    updateSelectedRecipe({
      steps: selectedRecipe.steps.map((step, stepIndex) =>
        stepIndex === index
          ? { instruction: { ...step.instruction, [language]: value } }
          : step,
      ),
    });
  }

  function updateTags(language: "zh" | "fr", value: string): void {
    if (!selectedRecipe) return;
    const texts = value.split(",").map((tag) => tag.trim()).filter(Boolean);

    setRecipes((current) =>
      current.map((recipe) => {
        if (recipe.id !== selectedRecipe.id) return recipe;

        const tags = texts.map((text, index) => ({
          zh: language === "zh" ? text : recipe.tags[index]?.zh ?? "",
          fr: language === "fr" ? text : recipe.tags[index]?.fr ?? "",
        }));

        return { ...recipe, tags };
      }),
    );
    setSaveError("");
  }

  function handleNewRecipe(): void {
    const recipe = createDraftRecipe();
    setRecipes((current) => [recipe, ...current]);
    setSelectedId(recipe.id);
    setSaveError("");
    setImageError("");
  }

  async function uploadRecipeImageFile(
    kind: RecipeImageKind,
    file: File | undefined,
  ): Promise<void> {
    if (!selectedRecipe || !file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("请上传 JPG、PNG 或 WebP 格式的图片。");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("图片大小不能超过 10MB。");
      return;
    }

    const recipeId = selectedRecipe.id;
    const imageField = kind === "cover" ? "coverImageUrl" : "finishedImageUrl";

    try {
      setUploadingImage(kind);
      setImageError("");
      const imagePath = await uploadRecipeImage(file);
      setRecipes((current) =>
        current.map((recipe) =>
          recipe.id === recipeId ? { ...recipe, [imageField]: imagePath } : recipe,
        ),
      );
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "图片上传失败，请重试。");
    } finally {
      setUploadingImage(null);
    }
  }

  async function saveRecipe(status?: RecipeStatus): Promise<void> {
    if (!selectedRecipe || uploadingImage) return;

    const recipeToSave = { ...selectedRecipe, status: status ?? selectedRecipe.status };
    const validationError = getRecipeValidationError(recipeToSave);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");
      const payload = toSaveRequest(recipeToSave);
      const savedRecipe = typeof recipeToSave.id === "number"
        ? await updateRecipe(recipeToSave.id, payload)
        : await createRecipe(payload);
      const nextRecipe = toEditableRecipe(savedRecipe);
      setRecipes((current) =>
        current.map((recipe) => (recipe.id === recipeToSave.id ? nextRecipe : recipe)),
      );
      setSelectedId(nextRecipe.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "食谱保存失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <button
            type="button"
            className={`${styles.menuToggle} ${menuOpen ? styles.menuToggleOpen : ""}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? menuLabels.close : menuLabels.open}
          >
            <span className={styles.menuToggleIcon} aria-hidden="true"><span /><span /><span /></span>
            {menuOpen ? menuLabels.close : menuLabels.open}
          </button>
          <div className={styles.topIndex}>
            <span><span className={styles.topIndexBold}>ZHAO</span>&nbsp;/&nbsp;FAMILY</span>
            <span>食谱 · RECIPE LIBRARY</span>
          </div>
        </div>
        <div className={styles.topLang} role="group" aria-label="Language">
          {DASHBOARD_LANGUAGES.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? <span className={styles.topLangSep}>/</span> : null}
              <button type="button" className={`${styles.topLangBtn} ${lang === option.value ? styles.topLangActive : ""}`} onClick={() => setLang(option.value as DashboardLanguage)}>{option.label}</button>
            </Fragment>
          ))}
        </div>
      </header>

      <motion.section className={styles.workspace} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className={styles.heading}>
          <div><p className={styles.kicker}><span /> 全门店共用 · 岗位内容库</p><h1>食谱<span>管理</span></h1><p>保存后，已发布食谱会按分配岗位同步给手机端成员。</p></div>
          <button type="button" className={styles.primaryButton} onClick={handleNewRecipe}>新建食谱 <span>＋</span></button>
        </div>

        <div className={styles.layout}>
          <aside className={styles.recipeList}>
            <div className={styles.listToolbar}>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索名称、分类或标签" aria-label="搜索食谱" />
              <div className={styles.statusFilters}>{[["all", "全部"], ["published", "已发布"], ["draft", "草稿"]].map(([value, label]) => <button type="button" key={value} className={statusFilter === value ? styles.statusActive : ""} onClick={() => setStatusFilter(value as "all" | RecipeStatus)}>{label}</button>)}</div>
            </div>
            <p className={styles.listSummary}>{visibleRecipes.length} 道食谱</p>
            {loadError ? <p className={styles.empty}>{loadError}</p> : null}
            <div className={styles.recipeRows}>{visibleRecipes.map((recipe) => <button type="button" key={recipe.id} className={`${styles.recipeRow} ${selectedRecipe?.id === recipe.id ? styles.recipeRowActive : ""}`} onClick={() => { setSelectedId(recipe.id); setSaveError(""); setImageError(""); }}><img src={recipe.coverImageUrl ? resolveRecipeImageUrl(recipe.coverImageUrl) : FALLBACK_IMAGE} alt="" /><span className={styles.recipeRowBody}><span className={styles.recipeRowTop}><em>{recipe.status === "published" ? "已发布" : "草稿"}</em><small>{localizedLabel(recipe.category, "zh")} / {localizedLabel(recipe.category, "fr")}</small></span><strong>{localizedLabel(recipe.name, "zh")} / {localizedLabel(recipe.name, "fr")}</strong><small>{roleNames(recipe.jobRoles) || "未分配岗位"}</small></span></button>)}</div>
          </aside>

          {selectedRecipe ? (
            <section className={styles.editor}>
              <div className={styles.editorHead}><div><p>正在编辑</p><h2>{localizedLabel(selectedRecipe.name, "zh")} / {localizedLabel(selectedRecipe.name, "fr")}</h2></div><div className={styles.editorActions}>{saveError ? <span className={styles.saveError}>{saveError}</span> : null}<button type="button" className={styles.outlineButton} disabled={isSaving || uploadingImage !== null} onClick={() => void saveRecipe(selectedRecipe.status === "published" ? "draft" : "published")}>{selectedRecipe.status === "published" ? "转为草稿并保存" : "发布"}</button><button type="button" className={styles.primaryButton} disabled={isSaving || uploadingImage !== null} onClick={() => void saveRecipe()}>{isSaving ? "保存中" : "保存更改"}</button></div></div>
              <div className={styles.editorGrid}><label className={styles.field}><span>食谱名称（中文）</span><input value={selectedRecipe.name.zh} onChange={(event) => updateSelectedRecipe({ name: { ...selectedRecipe.name, zh: event.target.value } })} /></label><label className={styles.field}><span>Nom de la recette (FR)</span><input value={selectedRecipe.name.fr} onChange={(event) => updateSelectedRecipe({ name: { ...selectedRecipe.name, fr: event.target.value } })} /></label><label className={styles.field}><span>分类（中文）</span><input value={selectedRecipe.category.zh} onChange={(event) => updateSelectedRecipe({ category: { ...selectedRecipe.category, zh: event.target.value } })} /></label><label className={styles.field}><span>Catégorie (FR)</span><input value={selectedRecipe.category.fr} onChange={(event) => updateSelectedRecipe({ category: { ...selectedRecipe.category, fr: event.target.value } })} /></label><label className={styles.field}><span>标签（中文，以逗号分隔）</span><input value={tagsToText(selectedRecipe.tags, "zh")} onChange={(event) => updateTags("zh", event.target.value)} /></label><label className={styles.field}><span>Tags (FR, séparés par des virgules)</span><input value={tagsToText(selectedRecipe.tags, "fr")} onChange={(event) => updateTags("fr", event.target.value)} /></label><label className={styles.field}><span>基础份数</span><input type="number" min="1" value={selectedRecipe.servings} onChange={(event) => updateSelectedRecipe({ servings: Number(event.target.value) })} /></label><label className={styles.field}><span>准备 / 烹饪时间（分钟）</span><div className={styles.timeFields}><input type="number" min="0" value={selectedRecipe.preparationMinutes} onChange={(event) => updateSelectedRecipe({ preparationMinutes: Number(event.target.value) })} /><input type="number" min="0" value={selectedRecipe.cookingMinutes} onChange={(event) => updateSelectedRecipe({ cookingMinutes: Number(event.target.value) })} /></div></label><label className={styles.field}><span>备注（中文）</span><input value={selectedRecipe.note.zh} onChange={(event) => updateSelectedRecipe({ note: { ...selectedRecipe.note, zh: event.target.value } })} /></label><label className={styles.field}><span>Note (FR)</span><input value={selectedRecipe.note.fr} onChange={(event) => updateSelectedRecipe({ note: { ...selectedRecipe.note, fr: event.target.value } })} /></label></div>
              <section className={styles.assignment}><div><p>岗位可见范围</p><span>手机端成员只会看到已发布且分配给其岗位的食谱。</span></div><div className={styles.roleChoices}>{RECIPE_ROLE_OPTIONS.map((role) => <button type="button" key={role.value} className={selectedRecipe.jobRoles.includes(role.value) ? styles.roleChoiceActive : ""} onClick={() => toggleRole(role.value)}>{role.label}</button>)}</div></section>
              <div className={styles.contentColumns}><section><div className={styles.sectionHeading}><h3>食材及用量</h3><button type="button" onClick={() => updateSelectedRecipe({ ingredients: [...selectedRecipe.ingredients, { name: { zh: "", fr: "" }, quantity: 0, unit: { zh: "g", fr: "g" } }] })}>添加食材</button></div><div className={styles.ingredients}>{selectedRecipe.ingredients.map((ingredient, index) => <div className={styles.ingredientRow} key={`${selectedRecipe.id}-${index}`}><input value={ingredient.name.zh} placeholder="食材（中文）" onChange={(event) => updateIngredientText(index, "name", "zh", event.target.value)} /><input value={ingredient.name.fr} placeholder="Ingrédient (FR)" onChange={(event) => updateIngredientText(index, "name", "fr", event.target.value)} /><input type="number" value={ingredient.quantity} onChange={(event) => updateIngredientQuantity(index, event.target.value)} /><input value={ingredient.unit.zh} placeholder="单位" onChange={(event) => updateIngredientText(index, "unit", "zh", event.target.value)} /><input value={ingredient.unit.fr} placeholder="Unité" onChange={(event) => updateIngredientText(index, "unit", "fr", event.target.value)} /></div>)}</div></section><section><div className={styles.sectionHeading}><h3>制作步骤</h3><button type="button" onClick={() => updateSelectedRecipe({ steps: [...selectedRecipe.steps, { instruction: { zh: "", fr: "" } }] })}>添加步骤</button></div><ol className={styles.steps}>{selectedRecipe.steps.map((step, index) => <li key={`${selectedRecipe.id}-${index}`}><div className={styles.stepTranslations}><textarea value={step.instruction.zh} placeholder="步骤（中文）" onChange={(event) => updateStep(index, "zh", event.target.value)} aria-label={`步骤 ${index + 1}（中文）`} /><textarea value={step.instruction.fr} placeholder="Étape (FR)" onChange={(event) => updateStep(index, "fr", event.target.value)} aria-label={`步骤 ${index + 1}（法文）`} /></div></li>)}</ol></section></div>
              <section className={styles.images}><div className={styles.imageField}><span>封面图</span><div className={styles.imagePreview}><img src={selectedRecipe.coverImageUrl ? resolveRecipeImageUrl(selectedRecipe.coverImageUrl) : FALLBACK_IMAGE} alt="食谱封面预览" /></div><label className={styles.imageUploadButton}><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage !== null} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void uploadRecipeImageFile("cover", file); }} />{uploadingImage === "cover" ? "上传中…" : "上传封面图"}</label></div><div className={styles.imageField}><span>成品图</span><div className={styles.imagePreview}><img src={selectedRecipe.finishedImageUrl ? resolveRecipeImageUrl(selectedRecipe.finishedImageUrl) : FALLBACK_IMAGE} alt="成品图预览" /></div><label className={styles.imageUploadButton}><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage !== null} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void uploadRecipeImageFile("finished", file); }} />{uploadingImage === "finished" ? "上传中…" : "上传成品图"}</label></div>{imageError ? <p className={styles.imageError}>{imageError}</p> : null}</section>
            </section>
          ) : <section className={styles.editor}><p className={styles.empty}>暂无食谱。点击“新建食谱”后即可录入真实数据。</p></section>}
        </div>
      </motion.section>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
