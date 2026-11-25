import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ExamCategoryView } from '../exam-bank.types';
import type {
  CreateExamCategoryDto,
  UpdateExamCategoryDto,
} from './dto/category.dto';
import { toCategoryView } from './question-view.mapper';

@Injectable()
export class ExamCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ExamCategoryView[]> {
    const rows = await this.prisma.examCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toCategoryView);
  }

  async create(dto: CreateExamCategoryDto): Promise<ExamCategoryView> {
    const nameZh = dto.nameZh?.trim();
    const nameFr = dto.nameFr?.trim();
    if (!nameZh || !nameFr)
      throw new BadRequestException('EXAM_CATEGORY_NAME_REQUIRED');
    try {
      const row = await this.prisma.examCategory.create({
        data: {
          code: dto.code,
          nameZh,
          nameFr,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
      return toCategoryView(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('EXAM_CATEGORY_CODE_TAKEN');
      }
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateExamCategoryDto,
  ): Promise<ExamCategoryView> {
    await this.findOrThrow(id);
    const row = await this.prisma.examCategory.update({
      where: { id },
      data: {
        nameZh: dto.nameZh?.trim() || undefined,
        nameFr: dto.nameFr?.trim() || undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
    return toCategoryView(row);
  }

  /** Questions of a deleted category keep existing with no category (FK SET NULL). */
  async remove(id: number): Promise<void> {
    await this.findOrThrow(id);
    await this.prisma.examCategory.delete({ where: { id } });
  }

  private async findOrThrow(id: number) {
    const row = await this.prisma.examCategory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('EXAM_CATEGORY_NOT_FOUND');
    return row;
  }
}
