import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRecipeDto } from './dto/create-recipe.dto';
import type { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import type { UpdateRecipeDto } from './dto/update-recipe.dto';
import { isRecipeImagePath } from './recipe-images.service';
import type { RecipeActor, RecipeItem, RecipeStatus } from './recipes.types';

const MANAGEMENT_JOB_ROLES = new Set([
  'holding',
  'regional-manager',
  'store-manager',
  'front-manager',
  'back-manager',
  'front-assistant',
  'back-assistant',
]);
const RECIPE_MANAGE_PERMISSION = 'recipe.manage';
const SYSTEM_PERMISSION_MANAGE = 'system.permission.manage';
const MAX_PAGE_SIZE = 100;

const RECIPE_INCLUDE = {
  jobRoles: { orderBy: { jobRole: 'asc' } },
  ingredients: { orderBy: { sortOrder: 'asc' } },
  steps: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.RecipeInclude;

type RecipeRecord = Prisma.RecipeGetPayload<{
  include: typeof RECIPE_INCLUDE;
}>;
type RecipeLocalizedText = {
  zh: string;
  fr: string;
};

function parseJobRoles(jobRole: string | null): string[] {
  return `${jobRole ?? ''}`
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
}

function normalizeTextList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeLocalizedText(
  value: RecipeLocalizedText,
): RecipeLocalizedText {
  return {
    zh: value.zh.trim(),
    fr: value.fr.trim(),
  };
}

function normalizeLocalizedList(
  values: RecipeLocalizedText[],
): RecipeLocalizedText[] {
  const seen = new Set<string>();

  return values.map(normalizeLocalizedText).filter((value) => {
    const key = `${value.zh}\u0000${value.fr}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toLocalizedTags(
  value: Prisma.JsonValue | null,
): RecipeLocalizedText[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) {
      const text = item.trim();
      return [{ zh: text, fr: text }];
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];

    const localized = item as Record<string, unknown>;
    const zh = typeof localized.zh === 'string' ? localized.zh.trim() : '';
    const fr = typeof localized.fr === 'string' ? localized.fr.trim() : '';

    return zh && fr ? [{ zh, fr }] : [];
  });
}

function toOptionalLocalizedText(
  zh: string | null,
  fr: string | null,
): RecipeLocalizedText | null {
  if (!zh && !fr) return null;

  return {
    zh: zh ?? fr ?? '',
    fr: fr ?? zh ?? '',
  };
}

function toRecipeItem(recipe: RecipeRecord): RecipeItem {
  return {
    id: recipe.id,
    name: { zh: recipe.name, fr: recipe.nameFr ?? recipe.name },
    category: { zh: recipe.category, fr: recipe.categoryFr ?? recipe.category },
    tags: toLocalizedTags(recipe.tags),
    servings: recipe.servings,
    preparationMinutes: recipe.preparationMinutes,
    cookingMinutes: recipe.cookingMinutes,
    coverImageUrl: recipe.coverImageUrl,
    finishedImageUrl: recipe.finishedImageUrl,
    note: toOptionalLocalizedText(recipe.note, recipe.noteFr),
    status: recipe.status as RecipeStatus,
    jobRoles: recipe.jobRoles.map((assignment) => assignment.jobRole),
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: { zh: ingredient.name, fr: ingredient.nameFr ?? ingredient.name },
      quantity: Number(ingredient.quantity),
      unit: { zh: ingredient.unit, fr: ingredient.unitFr ?? ingredient.unit },
      sortOrder: ingredient.sortOrder,
    })),
    steps: recipe.steps.map((step) => ({
      id: step.id,
      instruction: {
        zh: step.instruction,
        fr: step.instructionFr ?? step.instruction,
      },
      sortOrder: step.sortOrder,
    })),
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
  };
}

@Injectable()
export class RecipesService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(
    actor: RecipeActor,
    query: ListRecipesQueryDto,
  ): Promise<RecipeItem[]> {
    const where = this.buildListWhere(actor, query);
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);
    const recipes = await this.prismaService.recipe.findMany({
      where,
      include: RECIPE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return recipes.map(toRecipeItem);
  }

  async get(actor: RecipeActor, id: number): Promise<RecipeItem> {
    const recipe = await this.prismaService.recipe.findFirst({
      where: {
        AND: [{ id }, this.buildVisibilityWhere(actor)],
      },
      include: RECIPE_INCLUDE,
    });

    if (!recipe) {
      throw new NotFoundException('RECIPE_NOT_FOUND');
    }

    return toRecipeItem(recipe);
  }

  async create(actor: RecipeActor, dto: CreateRecipeDto): Promise<RecipeItem> {
    this.ensureCanManage(actor);
    const recipe = await this.prismaService.recipe.create({
      data: {
        name: dto.name.zh.trim(),
        nameFr: dto.name.fr.trim(),
        category: dto.category.zh.trim(),
        categoryFr: dto.category.fr.trim(),
        tags: normalizeLocalizedList(dto.tags ?? []),
        servings: dto.servings,
        preparationMinutes: dto.preparationMinutes,
        cookingMinutes: dto.cookingMinutes,
        coverImageUrl: this.normalizeImagePath(dto.coverImageUrl),
        finishedImageUrl: this.normalizeImagePath(dto.finishedImageUrl),
        note: dto.note?.zh.trim() || null,
        noteFr: dto.note?.fr.trim() || null,
        status: dto.status ?? 'draft',
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
        jobRoles: { create: this.toJobRoleRecords(dto.jobRoles) },
        ingredients: { create: this.toIngredientRecords(dto.ingredients) },
        steps: { create: this.toStepRecords(dto.steps) },
      },
      include: RECIPE_INCLUDE,
    });

    return toRecipeItem(recipe);
  }

  async update(
    actor: RecipeActor,
    id: number,
    dto: UpdateRecipeDto,
  ): Promise<RecipeItem> {
    this.ensureCanManage(actor);
    await this.findManagedRecipeOrThrow(id);
    const recipe = await this.prismaService.recipe.update({
      where: { id },
      data: {
        ...(dto.name !== undefined
          ? { name: dto.name.zh.trim(), nameFr: dto.name.fr.trim() }
          : {}),
        ...(dto.category !== undefined
          ? {
              category: dto.category.zh.trim(),
              categoryFr: dto.category.fr.trim(),
            }
          : {}),
        ...(dto.tags !== undefined
          ? { tags: normalizeLocalizedList(dto.tags) }
          : {}),
        ...(dto.servings !== undefined ? { servings: dto.servings } : {}),
        ...(dto.preparationMinutes !== undefined
          ? { preparationMinutes: dto.preparationMinutes }
          : {}),
        ...(dto.cookingMinutes !== undefined
          ? { cookingMinutes: dto.cookingMinutes }
          : {}),
        ...(dto.coverImageUrl !== undefined
          ? { coverImageUrl: this.normalizeImagePath(dto.coverImageUrl) }
          : {}),
        ...(dto.finishedImageUrl !== undefined
          ? { finishedImageUrl: this.normalizeImagePath(dto.finishedImageUrl) }
          : {}),
        ...(dto.note !== undefined
          ? {
              note: dto.note.zh.trim() || null,
              noteFr: dto.note.fr.trim() || null,
            }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        updatedByUserId: actor.id,
        ...(dto.jobRoles !== undefined
          ? {
              jobRoles: {
                deleteMany: {},
                create: this.toJobRoleRecords(dto.jobRoles),
              },
            }
          : {}),
        ...(dto.ingredients !== undefined
          ? {
              ingredients: {
                deleteMany: {},
                create: this.toIngredientRecords(dto.ingredients),
              },
            }
          : {}),
        ...(dto.steps !== undefined
          ? {
              steps: {
                deleteMany: {},
                create: this.toStepRecords(dto.steps),
              },
            }
          : {}),
      },
      include: RECIPE_INCLUDE,
    });

    return toRecipeItem(recipe);
  }

  async remove(actor: RecipeActor, id: number): Promise<void> {
    this.ensureCanManage(actor);
    await this.findManagedRecipeOrThrow(id);
    await this.prismaService.recipe.delete({ where: { id } });
  }

  private buildListWhere(
    actor: RecipeActor,
    query: ListRecipesQueryDto,
  ): Prisma.RecipeWhereInput {
    const where: Prisma.RecipeWhereInput = this.buildVisibilityWhere(actor);
    const search = query.search?.trim();
    const category = query.category?.trim();

    if (this.canManage(actor) && query.status) {
      where.status = query.status;
    }
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameFr: { contains: search } },
        { category: { contains: search } },
        { categoryFr: { contains: search } },
      ];
    }

    return where;
  }

  private buildVisibilityWhere(actor: RecipeActor): Prisma.RecipeWhereInput {
    if (this.canManage(actor)) {
      return {};
    }

    const roles = parseJobRoles(actor.jobRole);
    if (roles.length === 0) {
      return { id: -1 };
    }

    return {
      status: 'published',
      jobRoles: { some: { jobRole: { in: roles } } },
    };
  }

  private canManage(actor: RecipeActor): boolean {
    return (
      actor.permissions.includes(RECIPE_MANAGE_PERMISSION) ||
      actor.permissions.includes(SYSTEM_PERMISSION_MANAGE) ||
      parseJobRoles(actor.jobRole).some((role) =>
        MANAGEMENT_JOB_ROLES.has(role),
      )
    );
  }

  ensureCanManage(actor: RecipeActor): void {
    if (!this.canManage(actor)) {
      throw new ForbiddenException('RECIPE_MANAGEMENT_FORBIDDEN');
    }
  }

  private normalizeImagePath(imagePath: string | undefined): string | null {
    const normalizedPath = imagePath?.trim();

    if (!normalizedPath) {
      return null;
    }
    if (!isRecipeImagePath(normalizedPath)) {
      throw new BadRequestException('RECIPE_IMAGE_PATH_INVALID');
    }

    return normalizedPath;
  }

  private async findManagedRecipeOrThrow(id: number): Promise<void> {
    const recipe = await this.prismaService.recipe.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!recipe) {
      throw new NotFoundException('RECIPE_NOT_FOUND');
    }
  }

  private toJobRoleRecords(jobRoles: string[]): { jobRole: string }[] {
    return normalizeTextList(jobRoles).map((jobRole) => ({ jobRole }));
  }

  private toIngredientRecords(
    ingredients: {
      name: RecipeLocalizedText;
      quantity: number;
      unit: RecipeLocalizedText;
    }[],
  ): {
    name: string;
    nameFr: string;
    quantity: number;
    unit: string;
    unitFr: string;
    sortOrder: number;
  }[] {
    return ingredients.map((ingredient, index) => ({
      name: ingredient.name.zh.trim(),
      nameFr: ingredient.name.fr.trim(),
      quantity: ingredient.quantity,
      unit: ingredient.unit.zh.trim(),
      unitFr: ingredient.unit.fr.trim(),
      sortOrder: index,
    }));
  }

  private toStepRecords(
    steps: { instruction: RecipeLocalizedText }[],
  ): { instruction: string; instructionFr: string; sortOrder: number }[] {
    return steps.map((step, index) => ({
      instruction: step.instruction.zh.trim(),
      instructionFr: step.instruction.fr.trim(),
      sortOrder: index,
    }));
  }
}
