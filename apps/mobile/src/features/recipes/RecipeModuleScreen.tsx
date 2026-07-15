import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MANAGEMENT_JOB_ROLES, resolveJobRoles } from "@zhao/utils";
import type { AuthUser, Recipe, RecipeLocalizedText } from "@zhao/types";

import type { AuthLanguage } from "@/features/auth/authCopy";
import { fetchRecipes } from "@/features/recipes/recipesApi";
import { recipeStyles as styles } from "@/features/recipes/recipeStyles";
import { MOBILE_API_URL } from "@/lib/env";
import fallbackRecipeImage from "../../../assets/四大天王/1411631517542_.pic_hd.jpg";

type RecipeModuleScreenProps = {
  language: AuthLanguage;
  user: AuthUser;
};

type RecipeView = "list" | "detail";

const COPY = {
  zh: {
    title: "岗位食谱",
    kicker: "ZHAO · RECIPE LIBRARY",
    search: "搜索食谱或标签",
    count: "道可执行",
    allRecipes: "全部食谱",
    allCategories: "全部",
    noSearchResults: "没有匹配的食谱",
    rolePrefix: "当前岗位：",
    administratorMode: "管理员模式：全部食谱",
    emptyTitle: "当前岗位还没有食谱",
    emptyDetail: "管理端发布并分配岗位后，食谱会自动出现在这里。",
    loadError: "食谱加载失败，请稍后重试。",
    servings: "份数",
    ingredients: "食材及用量",
    steps: "制作步骤",
    note: "备注",
    favorite: "收藏",
    unfavorite: "已收藏",
    back: "返回食谱",
    prep: "准备",
    cook: "烹饪",
    featured: "推荐执行",
    openRecipe: "查看食谱",
  },
  en: {
    title: "Recipe library",
    kicker: "ZHAO · RECIPE LIBRARY",
    search: "Search recipes or tags",
    count: "ready to make",
    allRecipes: "All recipes",
    allCategories: "All",
    noSearchResults: "No matching recipes",
    rolePrefix: "Your role: ",
    administratorMode: "Admin mode: all recipes",
    emptyTitle: "No recipes for this role",
    emptyDetail: "Published recipes assigned to your role will appear here.",
    loadError: "Recipes could not be loaded. Please try again.",
    servings: "Servings",
    ingredients: "Ingredients",
    steps: "Method",
    note: "Note",
    favorite: "Save",
    unfavorite: "Saved",
    back: "Back to recipes",
    prep: "Prep",
    cook: "Cook",
    featured: "Recommended",
    openRecipe: "Open recipe",
  },
  fr: {
    title: "Recettes",
    kicker: "ZHAO · RECIPE LIBRARY",
    search: "Rechercher une recette",
    count: "à préparer",
    allRecipes: "Toutes les recettes",
    allCategories: "Toutes",
    noSearchResults: "Aucune recette correspondante",
    rolePrefix: "Votre poste : ",
    administratorMode: "Mode administrateur : toutes les recettes",
    emptyTitle: "Aucune recette pour ce poste",
    emptyDetail: "Les recettes publiées pour votre poste apparaîtront ici.",
    loadError: "Les recettes ne peuvent pas être chargées.",
    servings: "Portions",
    ingredients: "Ingrédients",
    steps: "Préparation",
    note: "Remarque",
    favorite: "Enregistrer",
    unfavorite: "Enregistrée",
    back: "Retour aux recettes",
    prep: "Préparation",
    cook: "Cuisson",
    featured: "À préparer",
    openRecipe: "Voir la recette",
  },
};

function scaledQuantity(quantity: number, factor: number): string {
  const value = quantity * factor;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatRoleLabels(roles: string[]): string {
  if (roles.length === 0) return "未设置岗位";

  return roles.join(" · ");
}

function getRecipeImage(imageUrl: string | null) {
  if (!imageUrl) return fallbackRecipeImage;

  return {
    uri: imageUrl.startsWith("/recipes/images/")
      ? `${MOBILE_API_URL}${imageUrl}`
      : imageUrl,
  };
}

function getRecipeText(
  value: RecipeLocalizedText,
  language: AuthLanguage,
): string {
  return language === "zh" ? value.zh || value.fr : value.fr || value.zh;
}

function RecipeTags({
  language,
  tags,
}: {
  language: AuthLanguage;
  tags: RecipeLocalizedText[];
}): React.JSX.Element {
  return (
    <View style={styles.tagRow}>
      {tags.map((tag) => (
        <Text key={`${tag.zh}-${tag.fr}`} style={styles.tag}>
          #{getRecipeText(tag, language)}
        </Text>
      ))}
    </View>
  );
}

export function RecipeModuleScreen({ language, user }: RecipeModuleScreenProps) {
  const copy = COPY[language];
  const [view, setView] = useState<RecipeView>("list");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState(COPY.zh.allCategories);
  const [servings, setServings] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadError, setLoadError] = useState("");
  const roles = useMemo(() => resolveJobRoles(user), [user]);
  const isRecipeAdministrator =
    roles.some((role) => MANAGEMENT_JOB_ROLES.some((value) => value === role)) ||
    (user.permissions || []).includes("recipe.manage") ||
    (user.permissions || []).includes("system.permission.manage");
  const allCategories = copy.allCategories;

  useEffect(() => {
    let isActive = true;

    async function loadRecipes(): Promise<void> {
      try {
        setLoadError("");
        const nextRecipes = await fetchRecipes({ pageSize: 100 });
        if (isActive) setRecipes(nextRecipes);
      } catch {
        if (isActive) setLoadError(copy.loadError);
      }
    }

    void loadRecipes();

    return () => {
      isActive = false;
    };
  }, [copy.loadError]);

  useEffect(() => {
    setCategory(allCategories);
  }, [allCategories]);

  const categories = useMemo(
    () => [
      allCategories,
      ...Array.from(
        new Set(recipes.map((recipe) => getRecipeText(recipe.category, language))),
      ),
    ],
    [allCategories, language, recipes],
  );
  const visibleRecipes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const recipeName = getRecipeText(recipe.name, language);
      const recipeCategory = getRecipeText(recipe.category, language);
      const recipeTags = recipe.tags.map((tag) => getRecipeText(tag, language));
      const matchesCategory = category === allCategories || recipeCategory === category;
      const matchesSearch =
        !query ||
        [recipeName, recipeCategory, ...recipeTags]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [allCategories, language, recipes, category, searchTerm]);
  const featuredRecipe = visibleRecipes[0];
  const hasActiveRecipeFilter =
    Boolean(searchTerm.trim()) || category !== allCategories;

  function openRecipe(recipe: Recipe): void {
    setSelectedRecipe(recipe);
    setServings(recipe.servings);
    setCompletedSteps([]);
    setView("detail");
  }

  function toggleFavorite(recipeId: number): void {
    setFavorites((current) =>
      current.includes(recipeId)
        ? current.filter((id) => id !== recipeId)
        : [...current, recipeId],
    );
  }

  function toggleStep(index: number): void {
    setCompletedSteps((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index],
    );
  }

  if (view === "detail" && selectedRecipe) {
    const multiplier = servings / selectedRecipe.servings;
    const isFavorite = favorites.includes(selectedRecipe.id);

    return (
      <View style={styles.module}>
        <Pressable
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => setView("list")}
        >
          <Ionicons color="#c11616" name="arrow-back" size={18} />
          <Text style={styles.backButtonText}>{copy.back}</Text>
        </Pressable>
        <Image
          source={getRecipeImage(selectedRecipe.finishedImageUrl)}
          resizeMode="cover"
          style={styles.heroImage}
        />
        <View style={styles.detailIntro}>
          <RecipeTags language={language} tags={selectedRecipe.tags} />
          <Text style={styles.detailTitle}>{getRecipeText(selectedRecipe.name, language)}</Text>
          <Text style={styles.meta}>
            {copy.prep} {selectedRecipe.preparationMinutes} MIN · {copy.cook}{" "}
            {selectedRecipe.cookingMinutes} MIN
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(selectedRecipe.id)}
          >
            <Text style={styles.favoriteButtonText}>
              {isFavorite ? copy.unfavorite : copy.favorite} {isFavorite ? "♥" : "♡"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionKicker}>01 · {copy.servings}</Text>
          <View style={styles.scaleControl}>
            <Pressable
              accessibilityLabel="减少份数"
              style={styles.scaleToggle}
              onPress={() => setServings((value) => Math.max(1, value - 1))}
            >
              <Text style={styles.scaleToggleText}>−</Text>
            </Pressable>
            <View>
              <Text style={styles.scaleNumber}>{servings}</Text>
              <Text style={styles.scaleText}>{copy.servings.toUpperCase()}</Text>
            </View>
            <Pressable
              accessibilityLabel="增加份数"
              style={styles.scaleToggle}
              onPress={() => setServings((value) => value + 1)}
            >
              <Text style={styles.scaleToggleText}>＋</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionKicker}>02 · {copy.ingredients}</Text>
          {selectedRecipe.ingredients.map((ingredient) => (
            <View key={ingredient.id} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>
                {getRecipeText(ingredient.name, language)}
              </Text>
              <Text style={styles.ingredientAmount}>
                {scaledQuantity(ingredient.quantity, multiplier)}
              </Text>
              <Text style={styles.ingredientUnit}>
                {getRecipeText(ingredient.unit, language)}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionKicker}>03 · {copy.steps}</Text>
          {selectedRecipe.steps.map((step, index) => {
            const complete = completedSteps.includes(index);

            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: complete }}
                key={step.id}
                style={styles.stepItem}
                onPress={() => toggleStep(index)}
              >
                <Text style={styles.stepNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <View style={[styles.stepCheck, complete ? styles.stepCheckDone : null]}>
                  {complete ? <Ionicons color="#fff" name="checkmark" size={15} /> : null}
                </View>
                <Text style={[styles.stepText, complete ? styles.stepTextDone : null]}>
                  {getRecipeText(step.instruction, language)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedRecipe.note ? (
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>04 · {copy.note}</Text>
            <Text style={styles.noteText}>
              {getRecipeText(selectedRecipe.note, language)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.module}>
      <View style={styles.pageIntro}>
        <Text style={styles.sectionKicker}>{copy.kicker}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{copy.title}</Text>
          <View style={styles.recipeCount}><Text style={styles.recipeCountText}>{recipes.length}</Text></View>
        </View>
        <Text style={styles.roleCaption}>
          {isRecipeAdministrator
            ? copy.administratorMode
            : `${copy.rolePrefix}${formatRoleLabels(roles)}`}
        </Text>
      </View>

      {featuredRecipe ? (
        <Pressable
          accessibilityRole="button"
          style={styles.featuredRecipe}
          onPress={() => openRecipe(featuredRecipe)}
        >
          <Image source={getRecipeImage(featuredRecipe.coverImageUrl)} resizeMode="cover" style={styles.featuredImage} />
          <View style={styles.featuredBody}>
            <View>
              <Text style={styles.featuredKicker}>{copy.featured}</Text>
              <Text style={styles.featuredTitle}>
                {getRecipeText(featuredRecipe.name, language)}
              </Text>
              <Text style={styles.featuredMeta}>
                {getRecipeText(featuredRecipe.category, language)} · {copy.prep}{" "}
                {featuredRecipe.preparationMinutes} MIN
              </Text>
            </View>
            <Text style={styles.featuredAction}>{copy.openRecipe} →</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons color="#c11616" name="book-outline" size={24} />
          <Text style={styles.emptyTitle}>{loadError || copy.emptyTitle}</Text>
          <Text style={styles.emptyDetail}>{loadError ? copy.emptyTitle : copy.emptyDetail}</Text>
        </View>
      )}

      <View style={styles.libraryHeader}>
        <Text style={styles.libraryTitle}>{copy.allRecipes}</Text>
        <Text style={styles.libraryCount}>{visibleRecipes.length} {copy.count}</Text>
      </View>
      <TextInput
        accessibilityLabel={copy.search}
        placeholder={copy.search}
        placeholderTextColor="rgba(10, 10, 10, 0.35)"
        style={styles.search}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroller}
        contentContainerStyle={styles.categoryRow}
      >
        {categories.map((item) => (
          <Pressable
            key={item}
            style={[styles.categoryButton, category === item ? styles.categoryButtonActive : null]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryText, category === item ? styles.categoryTextActive : null]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.recipeList}>
        {visibleRecipes.map((recipe) => (
          <Pressable
            accessibilityRole="button"
            key={recipe.id}
            style={styles.recipeRow}
            onPress={() => openRecipe(recipe)}
          >
            <Image source={getRecipeImage(recipe.coverImageUrl)} resizeMode="cover" style={styles.recipeRowImage} />
            <View style={styles.recipeRowBody}>
              <RecipeTags language={language} tags={recipe.tags} />
              <Text style={styles.recipeRowTitle}>
                {getRecipeText(recipe.name, language)}
              </Text>
              <Text style={styles.meta}>
                {getRecipeText(recipe.category, language)} · {copy.prep}{" "}
                {recipe.preparationMinutes} MIN · {copy.cook}{" "}
                {recipe.cookingMinutes} MIN
              </Text>
            </View>
          </Pressable>
        ))}
        {!featuredRecipe && !loadError && hasActiveRecipeFilter ? (
          <View style={styles.searchEmptyState}>
            <Ionicons color="#c11616" name="search-outline" size={20} />
            <Text style={styles.searchEmptyText}>{copy.noSearchResults}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
